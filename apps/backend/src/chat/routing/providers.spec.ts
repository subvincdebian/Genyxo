import {
  maxOutputFor,
  providerModelId,
  providerOf,
  seesImages,
  usesTools,
} from "./providers";
import { bestVisionModel, QUALITY } from "./fallback";

describe("providers", () => {
  it("routes each model id to its provider and the id it expects", () => {
    expect(providerOf("google/gemini-3.5-flash")).toBe("gemini");
    expect(providerOf("groq/openai/gpt-oss-120b")).toBe("groq");
    expect(providerOf("cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe(
      "cloudflare",
    );
    expect(providerOf("nim/mistralai/mistral-large-4-1t-a52b")).toBe("nvidia");
    expect(providerOf("mistral/mistral-medium-latest")).toBe("mistral");
    expect(providerOf("nvidia/nemotron-3-ultra-550b-a55b:free")).toBe(
      "openrouter",
    );
    expect(providerModelId("cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    );
    expect(providerModelId("nim/stepfun-ai/step-5-preview")).toBe(
      "stepfun-ai/step-5-preview",
    );
  });

  it("knows which models see images", () => {
    expect(seesImages("google/gemini-3.5-flash-lite")).toBe(true);
    expect(seesImages("groq/qwen/qwen3.8-27b")).toBe(true);
    expect(seesImages("nim/mistralai/mistral-large-4-1t-a52b")).toBe(true);
    expect(seesImages("groq/openai/gpt-oss-120b")).toBe(false);
    expect(seesImages("nvidia/nemotron-3-ultra-550b-a55b:free")).toBe(false);
    expect(seesImages("anthropic/claude-sonnet-4.6")).toBe(true);
  });

  it("gives tools to every provider but Cloudflare", () => {
    expect(usesTools("groq/openai/gpt-oss-120b")).toBe(true);
    expect(usesTools("nim/minimaxai/minimax-m3.1-flash")).toBe(true);
    expect(usesTools("cf/meta/llama-3.3-70b-instruct-fp8-fast")).toBe(false);
  });

  it("keeps free tiers within their per-minute budgets", () => {
    expect(maxOutputFor("groq/openai/gpt-oss-120b", 8192)).toBe(4096);
    expect(maxOutputFor("cf/openai/gpt-oss-120b", 8192)).toBe(2048);
    expect(maxOutputFor("google/gemini-3.5-flash", 8192)).toBe(8192);
  });

  it("hands pictures to the smartest model that sees them", () => {
    expect(bestVisionModel()).toBe("google/gemini-3.5-flash");
    expect(bestVisionModel(new Set(["google/gemini-3.5-flash"]))).toBe(
      "google/gemini-2.5-flash",
    );
    expect(new Set(QUALITY).size).toBe(QUALITY.length);
  });
});
