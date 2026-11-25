import {
  EmptyReplyError,
  isProviderFailure,
  nextReserve,
  reserveRoute,
} from "./fallback";

describe("reserve models", () => {
  it("treats outages, quotas, removed models and empty replies as provider failures", () => {
    expect(
      isProviderFailure(
        Object.assign(new Error("Too Many Requests"), { status: 429 }),
      ),
    ).toBe(true);
    expect(
      isProviderFailure(
        new Error("[503 Service Unavailable] The model is overloaded"),
      ),
    ).toBe(true);
    expect(
      isProviderFailure(
        new Error("[404 Not Found] models/gemini-2.5-pro is not found"),
      ),
    ).toBe(true);
    expect(
      isProviderFailure(new Error("No endpoints found for openai/gpt-x")),
    ).toBe(true);
    expect(isProviderFailure(new Error("fetch failed"))).toBe(true);
    expect(isProviderFailure(new EmptyReplyError("x"))).toBe(true);
  });

  it("never retries a stop or the user's own bad input", () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(isProviderFailure(abort)).toBe(false);
    expect(
      isProviderFailure(
        Object.assign(new Error("Invalid argument"), { status: 400 }),
      ),
    ).toBe(false);
    expect(isProviderFailure(undefined)).toBe(false);
  });

  it("hands a failed turn to the next smartest free model", () => {
    expect(
      nextReserve(
        "anthropic/claude-opus-4.6",
        new Set(["anthropic/claude-opus-4.6"]),
      ),
    ).toBe("google/gemini-3.5-flash");
    expect(
      nextReserve(
        "google/gemini-3.5-flash",
        new Set(["google/gemini-3.5-flash"]),
      ),
    ).toBe("groq/openai/gpt-oss-120b");
    expect(
      nextReserve(
        "groq/openai/gpt-oss-120b",
        new Set(["google/gemini-3.5-flash", "groq/openai/gpt-oss-120b"]),
      ),
    ).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
  });

  it("keeps attachments readable and stops after a few reserves", () => {
    const tried = new Set([
      "google/gemini-3.5-flash",
      "google/gemini-2.5-flash",
    ]);
    expect(
      nextReserve("google/gemini-2.5-flash", tried, { needsVision: true }),
    ).toBe("groq/qwen/qwen3.8-27b");
    expect(
      nextReserve("openai/gpt-5.1", new Set(["a", "b", "c", "d", "e", "f"])),
    ).toBeNull();
    expect(
      nextReserve("cf/black-forest-labs/flux-2-dev", new Set(["x"])),
    ).toBeNull();
  });

  it("says who answered and offers the original model again", () => {
    const route = reserveRoute(
      "anthropic/claude-opus-4.6",
      "google/gemini-3.5-flash",
      0,
      150,
    );
    expect(route.model).toBe("google/gemini-3.5-flash");
    expect(route.cost).toBe(0);
    expect(route.reason).toMatch(/Claude Opus 4.6 is not responding/);
    expect(route.alternatives[0]).toEqual({
      model: "anthropic/claude-opus-4.6",
      label: "Claude Opus 4.6",
      cost: 150,
    });
  });
});
