import { describeActionFences } from "./action-fence";
import { findPlugin } from "./catalog";
import { IntegrationToolsService } from "./integration-tools.service";
import { memoryRepository } from "./memory-repository.test-spec";
import { buildMimeMessage } from "./tools/google";
import { providerFetch } from "./tools/http";
import { geminiSchema } from "./mcp/tool-schema";
import * as mcp from "./mcp/mcp-client";

function setup(
  connected: string[] = ["github", "gmail"],
  options: { policy?: string; mcpTools?: mcp.McpTool[] } = {},
) {
  const fetchCalls: { url: string; init: any }[] = [];
  const responses: Record<string, unknown> = {};
  const integrations = {
    connectedPlugins: jest.fn(async () =>
      connected.map((id, index) => ({
        plugin: findPlugin(id)!,
        policy: options.policy || "ask",
        connectionId: index + 1,
      })),
    ),
    mcpTools: jest.fn(async () => options.mcpTools || []),
    context: jest.fn(async () => ({
      token: "token-1",
      metadata: {},
      credentials: {},
      fetch: async (url: string, init: any = {}) => {
        fetchCalls.push({ url, init });
        const key = Object.keys(responses).find((prefix) =>
          url.startsWith(prefix),
        );
        return key ? responses[key] : {};
      },
    })),
  };
  const actions = memoryRepository<any>();
  const messages = memoryRepository<any>([{ id: 50, userId: 9, content: "" }]);
  const service = new IntegrationToolsService(
    integrations as any,
    actions as any,
    messages as any,
  );
  return { service, integrations, actions, messages, fetchCalls, responses };
}

const linearTools: mcp.McpTool[] = [
  {
    name: "list_issues",
    description: "List issues",
    inputSchema: {
      type: "object",
      properties: {
        assignee: { type: ["string", "null"] },
        filter: { type: "object" },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_issue",
    description: "Create an issue",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        team: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "team"],
    },
    annotations: { destructiveHint: false },
  },
  {
    name: "delete_issue",
    description: "Delete an issue",
    inputSchema: { type: "object", properties: { id: { type: "string" } } },
  },
];

describe("IntegrationToolsService", () => {
  afterEach(() => jest.restoreAllMocks());

  it("offers only tools of connected plugins, with a raw API tool for full coverage", async () => {
    const { service } = setup(["github"]);
    const set = (await service.toolset(9))!;
    expect(set.tools.every((tool) => tool.pluginId === "github")).toBe(true);
    const names = service
      .geminiTools(set)[0]
      .functionDeclarations.map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "github_list_pull_requests",
        "github_api_request",
      ]),
    );
    expect(service.openAiTools(set)[0]).toMatchObject({
      type: "function",
      function: { name: "github_list_repos" },
    });
    expect(await setup([]).service.toolset(9)).toBeNull();
  });

  it("runs read tools immediately with the user's token", async () => {
    const { service, fetchCalls, responses } = setup();
    responses["https://api.github.com/search/issues"] = {
      total_count: 1,
      items: [
        {
          number: 4,
          title: "Fix login",
          state: "open",
          user: { login: "octo" },
          repository_url: "https://api.github.com/repos/octo/app",
          html_url: "https://github.com/octo/app/pull/4",
        },
      ],
    };
    const set = (await service.toolset(9))!;
    const outcome = await service.call(
      9,
      set,
      "github_list_pull_requests",
      {},
      { conversationId: 3 },
    );
    expect(fetchCalls[0].init.query.q).toBe("is:pr is:open author:@me");
    expect(outcome.output).toEqual({
      result: {
        total: 1,
        items: [expect.objectContaining({ number: 4, repository: "octo/app" })],
      },
    });
    expect(outcome.card).toBeUndefined();
  });

  it("never sends email from a tool call: it proposes a card and waits", async () => {
    const { service, fetchCalls, actions } = setup();
    const set = (await service.toolset(9))!;
    const outcome = await service.call(
      9,
      set,
      "gmail_send",
      { to: "x@example.com", subject: "Hi", body: "Hello there" },
      { conversationId: 3 },
    );
    expect(fetchCalls).toHaveLength(0);
    expect(outcome.output).toMatchObject({
      status: "awaiting_user_confirmation",
    });
    expect(outcome.card).toContain("```genyxo-action");
    expect(outcome.card).toContain("x@example.com");
    expect(actions.rows[0]).toMatchObject({
      userId: 9,
      tool: "gmail_send",
      status: "pending",
      conversationId: 3,
    });
  });

  it("lets low-risk drafts run directly only when the user allowed low-risk actions", async () => {
    const draft = { to: "x@example.com", subject: "Hi", body: "Draft" };
    const asked = setup(["gmail"]);
    expect(
      (
        await asked.service.call(
          9,
          (await asked.service.toolset(9))!,
          "gmail_create_draft",
          draft,
          {},
        )
      ).output,
    ).toMatchObject({ status: "awaiting_user_confirmation" });
    const allowed = setup(["gmail"], { policy: "low-risk" });
    allowed.responses["https://gmail.googleapis.com"] = { id: "d1" };
    const set = (await allowed.service.toolset(9))!;
    expect(
      (await allowed.service.call(9, set, "gmail_create_draft", draft, {}))
        .output,
    ).toEqual({
      result: {
        draftId: "d1",
        url: "https://mail.google.com/mail/u/0/#drafts",
      },
    });
    // Sending is never low-risk.
    expect(
      (await allowed.service.call(9, set, "gmail_send", draft, {})).output,
    ).toMatchObject({ status: "awaiting_user_confirmation" });
  });

  it("runs a confirmed action once and updates the card in the saved reply", async () => {
    const { service, fetchCalls, actions, messages, responses } = setup();
    responses["https://gmail.googleapis.com/gmail/v1/users/me/messages/send"] =
      { id: "m1" };
    const set = (await service.toolset(9))!;
    const outcome = await service.call(
      9,
      set,
      "gmail_send",
      { to: "x@example.com", subject: "Hi", body: "Hello" },
      {},
    );
    messages.rows[0].content = `Ready to send.${outcome.card}`;
    await service.attachMessage(9, [outcome.actionId!], 50);

    expect((await service.confirm(9, outcome.actionId!)).status).toBe("done");
    expect(fetchCalls.map((call) => call.url)).toEqual([
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    ]);
    expect(actions.rows[0].result).toMatchObject({
      url: "https://mail.google.com/mail/u/0/#sent/m1",
    });
    expect(messages.rows[0].content).toContain('"status":"done"');
    expect(describeActionFences(messages.rows[0].content)).toBe(
      'Ready to send.\n\n[Gmail action "Send email" — confirmed and completed: Send email — done]\n\n',
    );
    await expect(service.confirm(9, outcome.actionId!)).rejects.toThrow(
      "already done",
    );
    expect(fetchCalls).toHaveLength(1);
  });

  it("does not let another user confirm an action, and cancels without calling the provider", async () => {
    const { service, fetchCalls } = setup();
    const set = (await service.toolset(9))!;
    const outcome = await service.call(
      9,
      set,
      "github_create_repo",
      { name: "demo" },
      {},
    );
    await expect(service.confirm(10, outcome.actionId!)).rejects.toThrow(
      "Action not found",
    );
    await expect(service.cancel(9, outcome.actionId!)).resolves.toMatchObject({
      status: "cancelled",
    });
    expect(fetchCalls).toHaveLength(0);
  });

  it("asks before raw API writes but runs raw reads, and keeps paths inside the provider", async () => {
    const { service, fetchCalls } = setup(["github"]);
    const set = (await service.toolset(9))!;
    await service.call(
      9,
      set,
      "github_api_request",
      { path: "/repos/o/r/actions/runs", query: "per_page=5" },
      {},
    );
    expect(fetchCalls[0].url).toBe(
      "https://api.github.com/repos/o/r/actions/runs?per_page=5",
    );
    const write = await service.call(
      9,
      set,
      "github_api_request",
      {
        method: "POST",
        path: "/repos/o/r/releases",
        body: '{"tag_name":"v1"}',
      },
      {},
    );
    expect(write.card).toContain("POST /repos/o/r/releases");
    expect(
      (
        await service.call(
          9,
          set,
          "github_api_request",
          { path: "//evil.example/x" },
          {},
        )
      ).output.error,
    ).toContain("path");
    expect(
      (
        await service.call(
          9,
          set,
          "github_api_request",
          { path: "/../../x" },
          {},
        )
      ).output.error,
    ).toContain("path");
    expect(fetchCalls).toHaveLength(1);
  });

  it("exposes the provider's MCP tools: reads run, writes ask, and low-risk follows the policy", async () => {
    const call = jest
      .spyOn(mcp, "mcpCallTool")
      .mockResolvedValue({ content: [{ type: "text", text: "ok" }] });
    const { service } = setup(["linear"], { mcpTools: linearTools });
    const set = (await service.toolset(9))!;
    expect(set.tools.map((tool) => tool.name)).toEqual([
      "linear__list_issues",
      "linear__create_issue",
      "linear__delete_issue",
    ]);
    // Gemini gets a reduced schema: union types folded, empty nested objects as JSON text.
    expect(set.tools[0].gemini).toEqual({
      type: "object",
      properties: {
        assignee: { type: "string", nullable: true },
        filter: { type: "string", description: "(JSON object)" },
      },
    });
    expect(
      (
        await service.call(
          9,
          set,
          "linear__list_issues",
          { filter: '{"state":"open"}' },
          {},
        )
      ).output,
    ).toEqual({ result: { text: "ok" } });
    expect(call).toHaveBeenCalledWith(
      "https://mcp.linear.app/mcp",
      "token-1",
      "list_issues",
      { filter: { state: "open" } },
    );
    expect(
      (
        await service.call(
          9,
          set,
          "linear__create_issue",
          { title: "Bug", team: "ENG" },
          {},
        )
      ).card,
    ).toContain("Linear: Create issue");

    const allowed = setup(["linear"], {
      policy: "low-risk",
      mcpTools: linearTools,
    });
    const allowedSet = (await allowed.service.toolset(9))!;
    expect(
      (
        await allowed.service.call(
          9,
          allowedSet,
          "linear__create_issue",
          { title: "Bug", team: "ENG" },
          {},
        )
      ).output,
    ).toEqual({ result: { text: "ok" } });
    // Tools without destructiveHint=false always ask.
    expect(
      (
        await allowed.service.call(
          9,
          allowedSet,
          "linear__delete_issue",
          { id: "1" },
          {},
        )
      ).output,
    ).toMatchObject({ status: "awaiting_user_confirmation" });
  });

  it("confirms an MCP action by rebuilding the tool from the provider's list", async () => {
    const call = jest
      .spyOn(mcp, "mcpCallTool")
      .mockResolvedValue({ content: [{ type: "text", text: "deleted" }] });
    const { service } = setup(["linear"], { mcpTools: linearTools });
    const set = (await service.toolset(9))!;
    const outcome = await service.call(
      9,
      set,
      "linear__delete_issue",
      { id: "ENG-1" },
      {},
    );
    expect(call).not.toHaveBeenCalled();
    expect((await service.confirm(9, outcome.actionId!)).status).toBe("done");
    expect(call).toHaveBeenCalledWith(
      "https://mcp.linear.app/mcp",
      "token-1",
      "delete_issue",
      { id: "ENG-1" },
    );
  });

  it("switches large MCP tool sets to find/run meta tools", async () => {
    jest
      .spyOn(mcp, "mcpCallTool")
      .mockResolvedValue({ content: [{ type: "text", text: "done" }] });
    const many: mcp.McpTool[] = Array.from({ length: 120 }, (_, index) => ({
      name: `tool_${index}`,
      description: index === 7 ? "Create a sprint" : "Other",
      annotations: { readOnlyHint: index !== 7 },
    }));
    const { service } = setup(["atlassian"], { mcpTools: many });
    const set = (await service.toolset(9))!;
    expect(set.tools.map((tool) => tool.name)).toEqual([
      "atlassian__find_tools",
      "atlassian__run_tool",
    ]);
    const found = (
      await service.call(
        9,
        set,
        "atlassian__find_tools",
        { query: "sprint" },
        {},
      )
    ).output.result as any[];
    expect(found[0]).toMatchObject({ tool: "tool_7", changesData: true });
    const proposed = await service.call(
      9,
      set,
      "atlassian__run_tool",
      { tool: "tool_7", arguments: '{"name":"Sprint 4"}' },
      {},
    );
    expect(proposed.output).toMatchObject({
      status: "awaiting_user_confirmation",
    });
    expect((await service.confirm(9, proposed.actionId!)).status).toBe("done");
  });

  it("adds skill instructions for skill plugins", async () => {
    const { service } = setup(["superpowers", "github"]);
    const prompt = service.systemPrompt((await service.toolset(9))!);
    expect(prompt).toContain("Connected plugins: GitHub");
    expect(prompt).toContain("test-driven development");
  });

  it("reports invalid arguments and unknown tools back to the model", async () => {
    const { service } = setup(["github"]);
    const set = (await service.toolset(9))!;
    expect(
      (await service.call(9, set, "gmail_send", {}, {})).output.error,
    ).toContain("not available");
    expect(
      (await service.call(9, set, "github_create_repo", {}, {})).output.error,
    ).toBe('Invalid arguments: "name" is required');
  });
});

describe("provider helpers", () => {
  afterEach(() => jest.restoreAllMocks());

  it("builds a UTF-8 email and rejects header injection", () => {
    const raw = Buffer.from(
      buildMimeMessage({
        to: "a@example.com, b@example.com",
        subject: "Привіт",
        body: "Тест",
      }),
      "base64url",
    ).toString("utf8");
    expect(raw).toContain("To: a@example.com, b@example.com");
    expect(raw).toContain("Subject: =?UTF-8?B?");
    expect(() =>
      buildMimeMessage({
        to: "a@example.com\r\nBcc: evil@example.com",
        subject: "x",
        body: "y",
      }),
    ).toThrow();
  });

  it("sends the bearer token only over HTTPS and surfaces provider errors briefly", async () => {
    await expect(providerFetch("t", "http://api.example.com")).rejects.toThrow(
      "HTTPS",
    );
    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Bad credentials" }), {
        status: 401,
      }),
    );
    await expect(
      providerFetch("t", "https://api.github.com/user"),
    ).rejects.toThrow("401: Bad credentials");
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer t");
  });

  it("reduces MCP schemas to what Gemini accepts", () => {
    expect(
      geminiSchema({
        $schema: "x",
        type: "object",
        additionalProperties: false,
        properties: {
          tags: {
            type: "array",
            items: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
          mode: { enum: ["a", "b"], type: "string" },
        },
        required: ["mode", "missing"],
      }),
    ).toEqual({
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
        mode: { type: "string", enum: ["a", "b"] },
      },
      required: ["mode"],
    });
  });
});
