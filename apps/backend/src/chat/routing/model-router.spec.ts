import { routeModel, type RouteInput } from "./model-router";

const costs: Record<string, number> = {
  "anthropic/claude-sonnet-4.6": 75,
  "anthropic/claude-opus-4.6": 150,
  "openai/gpt-5-mini": 70,
  "openai/o3-reasoning": 150,
  "openai/gpt-5.1": 150,
  "openai/gpt-4.1": 55,
  "openai/dall-e-3": 120,
  "kling-video": 500,
};
const route = (text: string, extra: Partial<RouteInput> = {}) =>
  routeModel({ text, costOf: (model) => costs[model] ?? 0, ...extra });

describe("routeModel", () => {
  it("sends code to Claude", () => {
    const pick = route(
      "Why does this TypeScript function throw?\n```ts\nconst a = b!;\n```",
    );
    expect(pick.category).toBe("code");
    expect(pick.model).toBe("anthropic/claude-sonnet-4.6");
    expect(pick.cost).toBe(75);
  });

  it("sends current events to Gemini with web search", () => {
    const pick = route(
      "What are the latest news about the Mars mission today?",
    );
    expect(pick.category).toBe("search");
    expect(pick.model).toMatch(/^google\/gemini/);
    expect(pick.search).toBe(true);
  });

  it("sends image requests to DALL·E, in Russian too", () => {
    expect(route("Draw a picture of a cat astronaut").model).toBe(
      "openai/dall-e-3",
    );
    expect(route("Нарисуй кота в космосе").model).toBe("openai/dall-e-3");
  });

  it("answers short questions with the free fast model", () => {
    const pick = route("hi, how are you?");
    expect(pick.category).toBe("quick");
    expect(pick.cost).toBe(0);
  });

  it("reads attached PDFs with Gemini", () => {
    const pick = route("What does this say?", {
      files: [{ mime_type: "application/pdf" }],
    });
    expect(pick.category).toBe("files");
    expect(pick.model).toBe("google/gemini-3.5-flash");
  });

  it("steps down to an affordable model and says why", () => {
    const pick = route("Refactor this python function to be faster", {
      balance: 10,
    });
    expect(pick.model).toBe("google/gemini-3.5-flash");
    expect(pick.downgradedFrom?.model).toBe("anthropic/claude-sonnet-4.6");
    expect(pick.reason).toContain("75 credits");
  });

  it("reports a shortfall when nothing cheaper can do the job", () => {
    const pick = route("Generate an image of a sunset logo", { balance: 0 });
    expect(pick.model).toBe("openai/dall-e-3");
    expect(pick.shortfall).toBe(120);
  });

  it("follows the quality preference", () => {
    expect(
      route("Write an essay about the sea", { preference: "quality" }).model,
    ).toBe("anthropic/claude-opus-4.6");
    expect(
      route("Write an essay about the sea", { preference: "economy" }).cost,
    ).toBe(0);
  });

  it("is deterministic for the preview and the send", () => {
    const text = "Solve 2x + 3 = 11 step by step";
    expect(route(text)).toEqual(route(text));
  });
});

describe("autoFailover", () => {
  const { autoFailover } = jest.requireActual("./model-router");
  it("moves a busy Auto pick to a reserve Gemini model", () => {
    const pick = route("hello there");
    const reserve = autoFailover(
      pick,
      "gemini-3.5-flash-lite",
      new Error("[503 Service Unavailable] high demand"),
    );
    expect(reserve?.model).toBe("google/gemini-2.5-flash");
    expect(reserve?.route.reason).toContain("was busy");
  });
  it("leaves other errors and manual picks alone", () => {
    expect(
      autoFailover(
        route("hi"),
        "gemini-3.5-flash",
        new Error("400 bad request"),
      ),
    ).toBeNull();
    expect(
      autoFailover(undefined, "gemini-3.5-flash", new Error("503")),
    ).toBeNull();
  });
});
