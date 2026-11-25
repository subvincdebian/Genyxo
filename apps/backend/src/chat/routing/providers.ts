/**
 * Model ids name their provider: "groq/…" runs on Groq, "cf/…" on Cloudflare
 * Workers AI, "google/gemini…" on the Gemini API and everything else on
 * OpenRouter. Groq and Cloudflare speak the OpenAI API, so they share the
 * OpenRouter code path with their own client.
 */
export type ChatProvider = "gemini" | "openrouter" | "groq" | "cloudflare";

export function providerOf(model: string): ChatProvider {
  if (model.startsWith("google/gemini")) return "gemini";
  if (model.startsWith("groq/")) return "groq";
  if (model.startsWith("cf/")) return "cloudflare";
  return "openrouter";
}

/** The id the provider itself expects. */
export function providerModelId(model: string) {
  if (model.startsWith("groq/")) return model.slice("groq/".length);
  if (model.startsWith("cf/")) return `@cf/${model.slice("cf/".length)}`;
  return model;
}

/**
 * Models on Groq and Cloudflare that can look at images. OpenRouter and
 * Gemini models keep their current behaviour (they read what they support).
 */
const SEES_IMAGES = new Set([
  "groq/qwen/qwen3.8-27b",
  "cf/meta/llama-4-scout-17b-16e-instruct",
  "cf/mistralai/mistral-small-3.1-24b-instruct",
  "cf/meta/llama-3.2-11b-vision-instruct",
]);
export const seesImages = (model: string) =>
  providerOf(model) === "gemini" ||
  providerOf(model) === "openrouter" ||
  SEES_IMAGES.has(model);

/**
 * Free tiers count the answer's room against a per-minute token budget, so
 * these providers get a shorter answer limit than paid OpenRouter models.
 */
export function maxOutputFor(model: string, fallback: number) {
  if (providerOf(model) === "groq") return Math.min(fallback, 4096);
  if (providerOf(model) === "cloudflare") return Math.min(fallback, 2048);
  return fallback;
}

/**
 * Provider-specific request options. Qwen on Groq thinks out loud by default;
 * the answer should only hold the reply.
 */
export function providerParams(model: string): Record<string, unknown> {
  if (model.startsWith("groq/qwen/")) return { reasoning_format: "hidden" };
  return {};
}
