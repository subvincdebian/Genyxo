/**
 * Model ids name their provider: "groq/…" runs on Groq, "cf/…" on Cloudflare
 * Workers AI, "nim/…" on NVIDIA NIM, "mistral/…" on Mistral, "google/gemini…"
 * on the Gemini API and everything else on OpenRouter. All but Gemini speak
 * the OpenAI API, so they share one code path with their own client.
 */
export type ChatProvider =
  | "gemini"
  | "openrouter"
  | "groq"
  | "cloudflare"
  | "nvidia"
  | "mistral";

export function providerOf(model: string): ChatProvider {
  if (model.startsWith("google/gemini")) return "gemini";
  if (model.startsWith("groq/")) return "groq";
  if (model.startsWith("cf/")) return "cloudflare";
  if (model.startsWith("nim/")) return "nvidia";
  if (model.startsWith("mistral/")) return "mistral";
  return "openrouter";
}

/** The id the provider itself expects. */
export function providerModelId(model: string) {
  if (model.startsWith("groq/")) return model.slice("groq/".length);
  if (model.startsWith("cf/")) return `@cf/${model.slice("cf/".length)}`;
  if (model.startsWith("nim/")) return model.slice("nim/".length);
  if (model.startsWith("mistral/")) return model.slice("mistral/".length);
  return model;
}

/**
 * Models that look at images, checked by sending each one a picture.
 * Gemini reads images and PDFs natively.
 */
const SEES_IMAGES = new Set([
  "groq/qwen/qwen3.8-27b",
  "cf/meta/llama-4-scout-17b-16e-instruct",
  "cf/mistralai/mistral-small-3.1-24b-instruct",
  "nim/mistralai/mistral-large-4-1t-a52b",
  "nim/minimaxai/minimax-m3.1-flash",
  "nim/stepfun-ai/step-5-preview",
  "nim/nvidia/nemotron-3.5-super-vl-120b-a12b",
  "nim/nvidia/nemotron-3.5-bolt-e4b",
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  "mistral/mistral-medium-latest",
  "mistral/mistral-small-latest",
  "mistral/ministral-14b-latest",
]);
/** OpenRouter's free text-only models; paid OpenRouter models read images. */
const OPENROUTER_TEXT_ONLY =
  /nemotron-3-ultra|nemotron-3\.5-lightning|flint|lfm-/;

export function seesImages(model: string) {
  const provider = providerOf(model);
  if (provider === "gemini") return true;
  if (SEES_IMAGES.has(model)) return true;
  return (
    provider === "openrouter" &&
    !model.endsWith(":free") &&
    !OPENROUTER_TEXT_ONLY.test(model)
  );
}

/**
 * Whether the model gets Genyxo's tools (plugins, maps, web, memory, files,
 * tasks). Cloudflare's OpenAI-compatible API mishandles tool calls (models
 * call them unasked and the follow-up is rejected), so its models answer
 * without them.
 */
export const usesTools = (model: string) => providerOf(model) !== "cloudflare";

/**
 * Free tiers count the answer's room against a per-minute token budget, so
 * these providers get a shorter answer limit than paid OpenRouter models.
 */
export function maxOutputFor(model: string, fallback: number) {
  const provider = providerOf(model);
  if (provider === "groq" || provider === "nvidia")
    return Math.min(fallback, 4096);
  if (provider === "cloudflare") return Math.min(fallback, 2048);
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
