import { ChatService } from "./chat.service";
import { ModelType } from "./pricing.service";
import { IntegrationToolsService } from "../integrations/integration-tools.service";
import { findPlugin } from "../integrations/catalog";
import { memoryRepository } from "../integrations/memory-repository.test-spec";

async function* stream(chunks: unknown[]) {
  for (const chunk of chunks) yield chunk;
}
const gemini = (parts: unknown[]) => ({
  candidates: [{ content: { role: "model", parts } }],
});

function setup() {
  const providerCalls: string[] = [];
  const integrations = {
    connectedPlugins: jest.fn(async () =>
      ["github", "gmail"].map((id, index) => ({
        plugin: findPlugin(id)!,
        policy: "ask",
        connectionId: index + 1,
      })),
    ),
    context: jest.fn(async () => ({
      token: "t",
      metadata: {},
      credentials: {},
      fetch: async (url: string) => {
        providerCalls.push(url);
        return {
          total_count: 1,
          items: [
            {
              number: 12,
              title: "Add plugins",
              state: "open",
              user: { login: "octo" },
              html_url: "https://github.com/o/r/pull/12",
            },
          ],
        };
      },
    })),
  };
  const actions = memoryRepository<any>();
  const tools = new IntegrationToolsService(
    integrations as any,
    actions as any,
    memoryRepository<any>() as any,
  );
  const users = {
    logTransaction: jest.fn(),
    getBalance: jest.fn(async () => 90),
    addCredits: jest.fn(),
  };
  const pricing = { getModelConfig: () => ({ type: ModelType.TEXT }) };
  const config = { get: () => "key" };
  const service = new ChatService(
    config as any,
    {} as any,
    pricing as any,
    users as any,
    {} as any,
    {} as any,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    tools,
  );
  const saved: any[] = [];
  Object.assign(service as any, {
    normalizeAttachedFiles: async () => [],
    getOrCreateConversation: async () => ({ id: 5, title: "Chat" }),
    saveMessage: jest.fn(
      async (
        _conversation: any,
        content: string,
        sender: string,
        _model: string,
        _user: number,
        _req: any,
        _files: any,
        activity?: string[],
      ) => {
        saved.push({ content, sender, activity });
        return { id: saved.length };
      },
    ),
    prepareConversationContext: async () => ({
      messages: [{ id: 1, sender: "user", content: "list my open PRs" }],
      summary: "",
      projectSources: [],
    }),
    buildSystemInstruction: async () => "system",
    writeStreamChunk: async (res: any, data: string) => {
      res.write(data);
      return true;
    },
  });
  const events: any[] = [];
  const res = {
    write: jest.fn((data: string) =>
      events.push(JSON.parse(data.replace(/^data: /, ""))),
    ),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { service, res, events, saved, actions, providerCalls };
}

describe("ChatService plugin tools", () => {
  it("runs a Gemini function call, streams its activity and answers with the result", async () => {
    const { service, res, events, saved, providerCalls } = setup();
    const generateContentStream = jest
      .fn()
      .mockResolvedValueOnce({
        stream: stream([
          gemini([
            {
              functionCall: { name: "github_list_pull_requests", args: {} },
              thoughtSignature: "sig-1",
            },
          ]),
        ]),
      })
      .mockResolvedValueOnce({
        stream: stream([
          gemini([{ text: "You have one open PR: " }]),
          gemini([{ text: "#12 Add plugins." }]),
        ]),
      });
    const getGenerativeModel = jest.fn(() => ({ generateContentStream }));
    (service as any).googleAI = { getGenerativeModel };

    await service.processStreamingMessage(
      9,
      "list my open PRs",
      "google/gemini-3.5-flash-lite",
      undefined,
      1,
      [],
      res as any,
    );

    const modelOptions = (getGenerativeModel.mock.calls[0] as any[])[0];
    expect(
      modelOptions.tools[0].functionDeclarations.map((item: any) => item.name),
    ).toContain("github_list_pull_requests");
    expect(modelOptions.systemInstruction).toContain(
      "Connected plugins: GitHub, Gmail",
    );
    expect(providerCalls).toEqual(["https://api.github.com/search/issues"]);
    // The function call goes back with its thought signature, followed by the result.
    const followUp = generateContentStream.mock.calls[1][0].contents;
    expect(followUp.at(-2)).toEqual({
      role: "model",
      parts: [
        {
          functionCall: { name: "github_list_pull_requests", args: {} },
          thoughtSignature: "sig-1",
        },
      ],
    });
    expect(
      followUp.at(-1).parts[0].functionResponse.response.result.items[0],
    ).toMatchObject({ number: 12 });
    expect(events).toContainEqual({
      status: "activity",
      step: "GitHub · Listing pull requests",
    });
    expect(saved.at(-1)).toMatchObject({
      sender: "bot",
      content: "You have one open PR: #12 Add plugins.",
    });
    expect(saved.at(-1).activity).toContain("GitHub · Listing pull requests");
    expect(events.at(-1)).toMatchObject({ status: "done" });
  });

  it("shows a confirmation card instead of sending email", async () => {
    const { service, res, events, saved, actions, providerCalls } = setup();
    const generateContentStream = jest
      .fn()
      .mockResolvedValueOnce({
        stream: stream([
          gemini([
            {
              functionCall: {
                name: "gmail_create_draft",
                args: {
                  to: "anna@example.com",
                  subject: "Plan",
                  body: "Hi Anna",
                },
              },
            },
          ]),
        ]),
      })
      .mockResolvedValueOnce({
        stream: stream([gemini([{ text: "Review the draft and confirm." }])]),
      });
    (service as any).googleAI = {
      getGenerativeModel: () => ({ generateContentStream }),
    };

    await service.processStreamingMessage(
      9,
      "draft an email to Anna",
      "google/gemini-3.5-flash-lite",
      undefined,
      1,
      [],
      res as any,
    );

    expect(providerCalls).toEqual([]);
    expect(actions.rows[0]).toMatchObject({
      status: "pending",
      tool: "gmail_create_draft",
      messageId: saved.length,
    });
    const reply = saved.at(-1).content as string;
    expect(reply).toContain("```genyxo-action");
    expect(reply).toContain("anna@example.com");
    expect(reply.trim().endsWith("Review the draft and confirm.")).toBe(true);
    expect(events.some((event) => event.token?.includes("genyxo-action"))).toBe(
      true,
    );
    const response =
      generateContentStream.mock.calls[1][0].contents.at(-1).parts[0]
        .functionResponse.response;
    expect(response).toMatchObject({ status: "awaiting_user_confirmation" });
  });

  it("runs OpenAI-style tool calls streamed by OpenRouter", async () => {
    const { service, res, saved, providerCalls } = setup();
    const chunk = (delta: unknown) => ({ choices: [{ delta }] });
    const create = jest
      .fn()
      .mockResolvedValueOnce(
        stream([
          chunk({
            tool_calls: [
              {
                index: 0,
                id: "call_1",
                function: { name: "github_list_pull_requests", arguments: "" },
              },
            ],
          }),
          chunk({
            tool_calls: [{ index: 0, function: { arguments: '{"state":' } }],
          }),
          chunk({
            tool_calls: [{ index: 0, function: { arguments: '"open"}' } }],
          }),
        ]),
      )
      .mockResolvedValueOnce(stream([chunk({ content: "One open PR." })]));
    (service as any).openRouter = { chat: { completions: { create } } };

    await service.processStreamingMessage(
      9,
      "list my PRs",
      "openai/gpt-5-mini",
      undefined,
      1,
      [],
      res as any,
    );

    expect(
      create.mock.calls[0][0].tools.map((tool: any) => tool.function.name),
    ).toContain("gmail_send");
    expect(providerCalls).toHaveLength(1);
    const messages = create.mock.calls[1][0].messages;
    expect(messages.at(-2)).toMatchObject({
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          function: {
            name: "github_list_pull_requests",
            arguments: '{"state":"open"}',
          },
        },
      ],
    });
    expect(messages.at(-1)).toMatchObject({
      role: "tool",
      tool_call_id: "call_1",
    });
    expect(saved.at(-1).content).toBe("One open PR.");
  });

  it("answers without plugins when the OpenRouter model has no tool support", async () => {
    const { service, res, saved } = setup();
    const create = jest
      .fn()
      .mockRejectedValueOnce(
        new Error("404 No endpoints found that support tool use"),
      )
      .mockResolvedValueOnce(
        stream([{ choices: [{ delta: { content: "Plain answer" } }] }]),
      );
    (service as any).openRouter = { chat: { completions: { create } } };
    await service.processStreamingMessage(
      9,
      "hi",
      "some/model",
      undefined,
      1,
      [],
      res as any,
    );
    expect(create.mock.calls[1][0].tools).toBeUndefined();
    expect(saved.at(-1).content).toBe("Plain answer");
  });
});
