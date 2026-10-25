import { ConfigService } from "@nestjs/config";
import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { WorkspaceService } from "./workspace.service";

// Persistence is an injected boundary; the fake retains actual mutations so
// assertions verify resulting state rather than calls to repository mocks.
function repository(initial: any[] = []) {
  const rows = initial;
  const matches = (row: any, where: any) =>
    Object.entries(where).every(([key, value]) => row[key] === value);
  return {
    rows,
    create: (data: any) => ({ ...data }),
    findOne: async ({ where }: any) =>
      rows.find((row) => matches(row, where)) || null,
    find: async ({ where = {} }: any = {}) =>
      rows.filter((row) => matches(row, where)),
    save: async (row: any) => {
      if (!row.id) {
        row.id = Math.max(0, ...rows.map((old) => Number(old.id) || 0)) + 1;
        rows.push(row);
      }
      return row;
    },
    insert: async (row: any) => {
      if (
        rows.some(
          (old) =>
            old.userId === row.userId &&
            old.kind === row.kind &&
            old.recordKey === row.recordKey,
        )
      )
        throw Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" });
      row.id = rows.length + 1;
      rows.push(row);
      return { identifiers: [{ id: row.id }] };
    },
    update: async (where: any, patch: any) => {
      const selected = rows.filter((row) => matches(row, where));
      selected.forEach((row) => Object.assign(row, patch));
      return { affected: selected.length };
    },
    delete: async (where: any) => {
      const index = rows.findIndex((row) => matches(row, where));
      if (index < 0) return { affected: 0 };
      rows.splice(index, 1);
      return { affected: 1 };
    },
  };
}

describe("Workspace ownership and shared context", () => {
  let service: WorkspaceService;
  let conversations: ReturnType<typeof repository>;
  let records: ReturnType<typeof repository>;
  let projects: ReturnType<typeof repository>;
  let library: ReturnType<typeof repository>;
  let media: ReturnType<typeof repository>;
  beforeEach(() => {
    conversations = repository([
      {
        id: 4,
        userId: 1,
        title: "Fallback",
        titleSource: "fallback",
        titleVersion: 0,
        titleStatus: "idle",
        projectId: 7,
        presetId: null,
        updatedAt: new Date(0),
        lastActivityAt: new Date(0),
      },
    ]);
    records = repository();
    projects = repository([
      { id: 7, userId: 1, name: "Owned", presetId: null },
    ]);
    library = repository([
      { id: 2, userId: 1, name: "Saved", isFavorite: false, folderId: null },
    ]);
    media = repository([
      {
        id: "5f1c6f53-7c6a-4d1e-9a51-2b8f5d0c9e11",
        userId: 1,
        kind: "music",
        status: "ready",
        prompt: "  Calm   piano loop ",
        conversationId: 4,
        createdAt: new Date(1),
      },
      {
        id: "0c0b7a43-1f7e-4a8e-8f3c-9d1e2a3b4c5d",
        userId: 1,
        kind: "video",
        status: "pending",
        prompt: "Unfinished",
        conversationId: 4,
        createdAt: new Date(2),
      },
    ]);
    const config = new ConfigService({
      WORKSPACE_ENCRYPTION_KEY: "a".repeat(64),
      OPENROUTER_API_KEY: "test",
    });
    service = new WorkspaceService(
      config,
      conversations as any,
      projects as any,
      records as any,
      library as any,
      repository() as any,
      media as any,
    );
  });

  it("denies metadata updates to somebody else's conversation", async () => {
    await expect(
      service.patchConversation(2, 4, { pinned: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.rows[0].pinnedAt).toBeUndefined();
  });
  it("pins and archives without changing message activity", async () => {
    await service.patchConversation(1, 4, { pinned: true, archived: true });
    expect(conversations.rows[0].pinnedAt).toBeInstanceOf(Date);
    expect(conversations.rows[0].archivedAt).toBeInstanceOf(Date);
    expect(conversations.rows[0].lastActivityAt).toEqual(new Date(0));
  });
  it("validates destination ownership before moving a chat", async () => {
    await expect(
      service.patchConversation(1, 4, { projectId: 88 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.rows[0].projectId).toBe(7);
  });
  it("builds fresh project memory and preset context and excludes another owner", async () => {
    await service.saveMemory(1, { content: "Use metric units", projectId: 7 });
    await service.saveMemory(2, {
      content: "Secret foreign fact",
      projectId: null,
    });
    const preset = await service.savePreset(1, {
      name: "Editor",
      instructions: "Explain with examples",
    });
    await service.applyPreset(1, 4, preset.id);
    const text = await service.getAdditionalContext(1, 4, 7);
    expect(text).toContain("Use metric units");
    expect(text).toContain("Explain with examples");
    expect(text).not.toContain("Secret foreign fact");
    const memory = records.rows.find(
      (row) => row.kind === "memory" && row.userId === 1,
    );
    await service.saveMemory(1, { enabled: false }, memory.id);
    expect(await service.getAdditionalContext(1, 4, 7)).not.toContain(
      "Use metric units",
    );
  });
  it("rejects a private preset owned by another account", async () => {
    const preset = await service.savePreset(2, {
      name: "Private",
      instructions: "Secret",
    });
    await expect(service.applyPreset(1, 4, preset.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
  it("preserves manual titles when a generated title finishes later", async () => {
    await service.patchConversation(1, 4, { title: "My manual title" });
    await service.completeTitle(1, 4, 0, "Generated title");
    expect(conversations.rows[0].title).toBe("My manual title");
    expect(conversations.rows[0].titleSource).toBe("manual");
  });
  it("caps title generation at exactly twenty tokens", async () => {
    const provider = jest.fn().mockResolvedValue({
      choices: [{ message: { content: "Planning a garden" } }],
    });
    (service as any).openRouter = {
      chat: { completions: { create: provider } },
    };
    await service.generateTitleText(
      "How should I plant a garden?",
      "Start with soil",
    );
    expect(provider.mock.calls[0][0].max_tokens).toBe(20);
    expect(provider.mock.calls[0][0].model).toBe("openai/gpt-4o-mini");
  });
  it("persists favorite state and rejects foreign folder IDs", async () => {
    await service.saveLibrary(1, { isFavorite: true }, 2);
    expect(library.rows[0].isFavorite).toBe(true);
    await expect(
      service.saveLibrary(1, { folderId: 999 }, 2),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(library.rows[0].folderId).toBeNull();
  });
  it("encrypts personal credentials and never serializes them", async () => {
    const connection = await service.saveConnection(1, {
      name: "Personal API",
      endpoint: "https://example.com/api",
      apiKey: "super-secret",
    });
    expect(JSON.stringify(connection)).not.toContain("super-secret");
    expect(JSON.stringify(records.rows)).not.toContain("super-secret");
    expect(records.rows[0].data.encryptedCredentials).toBeTruthy();
    await expect(
      service.saveConnection(1, {
        name: "Unsafe",
        endpoint: "http://127.0.0.1/internal",
      }),
    ).rejects.toThrow();
  });
  it("reports a genuinely unavailable scheduler and rejects creation", async () => {
    expect(await service.listScheduled(1)).toMatchObject({
      available: false,
      items: [],
    });
    await expect(service.saveScheduled()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
  it("keeps deleted generated media out of later library indexing", async () => {
    Object.assign(library.rows[0], { type: "image", sourceMessageId: 9 });
    await service.deleteLibrary(1, 2);
    expect(library.rows).toHaveLength(0);
    expect(await service.hiddenLibrarySources(1)).toEqual([9]);
    expect(await service.hiddenLibrarySources(2)).toEqual([]);
  });
  it("indexes finished generated media once and respects deletion", async () => {
    await service.indexGeneratedMedia(1);
    await service.indexGeneratedMedia(1);
    const added = library.rows.filter((row) =>
      String(row.url).startsWith("/api/chat/media/"),
    );
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      type: "audio",
      name: "Calm piano loop",
      conversationId: 4,
      url: "/api/chat/media/5f1c6f53-7c6a-4d1e-9a51-2b8f5d0c9e11",
    });
    await service.deleteLibrary(1, added[0].id);
    await service.indexGeneratedMedia(1);
    expect(
      library.rows.filter((row) => String(row.url).startsWith("/api/")),
    ).toHaveLength(0);
    expect(await service.hiddenLibrarySources(1)).toEqual([]);
  });
  it("deduplicates concurrent first sends before charging or creating chats", async () => {
    expect(
      await (service as any).claimRequest(1, "request-123", {
        message: "hello",
      }),
    ).toEqual({ replay: null });
    await expect(
      (service as any).claimRequest(1, "request-123", { message: "hello" }),
    ).rejects.toThrow("already processing");
    await (service as any).completeRequest(1, "request-123", {
      conversationId: 4,
      messageId: 8,
    });
    expect(
      await (service as any).claimRequest(1, "request-123", {
        message: "hello",
      }),
    ).toEqual({ replay: { conversationId: 4, messageId: 8 } });
    await expect(
      (service as any).claimRequest(1, "request-123", { message: "different" }),
    ).rejects.toThrow("different request");
    expect(records.rows.filter((row) => row.kind === "request")).toHaveLength(
      1,
    );
  });
  it("does not requeue a failed or manual title on repeated refresh requests", async () => {
    conversations.rows[0].titleStatus = "failed";
    expect(await service.queueTitle(1, 4)).toMatchObject({
      titleStatus: "failed",
    });
    await service.patchConversation(1, 4, { title: "Manual" });
    expect(await service.queueTitle(1, 4)).toMatchObject({
      titleStatus: "complete",
    });
  });
  it("persists a request's owned conversation so interrupted clients can reconnect", async () => {
    await service.claimRequest(1, "recover-123", { message: "hello" });
    await expect(
      service.linkRequest(2, "recover-123", 4),
    ).rejects.toBeInstanceOf(NotFoundException);
    await service.linkRequest(1, "recover-123", 4);
    try {
      await service.claimRequest(1, "recover-123", { message: "hello" });
      throw new Error("Expected a processing conflict");
    } catch (error) {
      expect(
        (error as { getResponse: () => unknown }).getResponse(),
      ).toMatchObject({ conversationId: 4 });
    }
  });
  it("keeps personal memories out of isolated project conversations", async () => {
    await service.saveMemory(1, {
      content: "Personal preference",
      projectId: null,
    });
    await service.saveMemory(1, { content: "Project decision", projectId: 7 });
    const text = await service.getAdditionalContext(1, 4, 7);
    expect(text).toContain("Project decision");
    expect(text).not.toContain("Personal preference");
  });
  it("keeps the applied skill version when its template is edited", async () => {
    const preset = await service.savePreset(1, {
      name: "Editor",
      instructions: "Original instructions",
    });
    await service.applyPreset(1, 4, preset.id);
    await service.savePreset(
      1,
      { name: "Editor", instructions: "Changed instructions" },
      preset.id,
    );
    const text = await service.getAdditionalContext(1, 4, 7);
    expect(text).toContain("Original instructions");
    expect(text).not.toContain("Changed instructions");
  });
  it("rejects verbose generated titles even with the twenty-token provider budget", async () => {
    (service as any).openRouter = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "This title has far too many words for the sidebar",
                },
              },
            ],
          }),
        },
      },
    };
    await expect(
      service.generateTitleText("Question", "Answer"),
    ).rejects.toThrow();
  });
  it("serves a stored project file only to its owner", async () => {
    projects.rows[0].files = [
      {
        id: "file-1",
        name: "brief.txt",
        mime_type: "text/plain",
        data: "dGVzdA==",
        extracted_text: "test",
      },
    ];
    await expect(
      (service as any).getProjectFile(2, 7, "file-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(await (service as any).getProjectFile(1, 7, "file-1")).toMatchObject(
      { name: "brief.txt", extracted_text: "test" },
    );
  });
});
