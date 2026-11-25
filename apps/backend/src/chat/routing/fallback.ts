import { labelOf, type RouteDecision } from "./model-router";
import { seesImages } from "./providers";

/**
 * Reserve models: when a provider fails before the first word of an answer
 * (an outage, a quota, a removed model, a timeout or an empty reply), the turn
 * moves on to the next model in the chain instead of showing an error.
 *
 * Gemini is free on our key and answers most things well; Groq and
 * OpenRouter's free models run elsewhere, so one outage never takes all down.
 */
/**
 * Every free text model, smartest first. A failed model hands the turn to the
 * next one here that has not failed yet, so a medium question never lands on
 * a weak model while a stronger one still has quota. Providers alternate
 * near the top, so one provider's outage costs a single step.
 */
export const QUALITY = [
  "google/gemini-3.5-flash",
  "groq/openai/gpt-oss-120b",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemini-2.5-flash",
  "groq/qwen/qwen3.8-27b",
  "nvidia/nemotron-3.5-super-vl:free",
  "google/gemini-3.5-flash-lite",
  "google/gemini-3.1-flash-lite",
  "groq/openai/gpt-oss-20b",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  // NVIDIA NIM: strong but its free queue answers in 30 s to 3 min, so it
  // only steps in once the fast providers are out.
  "nim/mistralai/mistral-large-4-1t-a52b",
  "nim/stepfun-ai/step-5-preview",
  "nim/minimaxai/minimax-m3.1-flash",
  "nim/nvidia/nemotron-3-ultra-550b-a55b",
  "nim/nvidia/nemotron-3.5-super-vl-120b-a12b",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  // Cloudflare last: its small daily allowance is kept for images.
  "cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "cf/openai/gpt-oss-120b",
  "cf/mistralai/mistral-small-3.1-24b-instruct",
  "cf/meta/llama-4-scout-17b-16e-instruct",
  "cf/qwen/qwen2.5-coder-32b-instruct",
  "cf/ibm-granite/granite-4.0-h-micro",
];
const MAX_RESERVES = 5;

/** The smartest free model that can look at images, for turns with pictures. */
export function bestVisionModel(exclude: Set<string> = new Set()) {
  return QUALITY.find((model) => seesImages(model) && !exclude.has(model));
}

export class EmptyReplyError extends Error {
  constructor(model: string) {
    super(`${model} returned an empty reply`);
    this.name = "EmptyReplyError";
  }
}

/** True for failures another provider can fix; false for the user's stop or bad input. */
export function isProviderFailure(error: unknown) {
  if (!error) return false;
  const anyError = error as {
    name?: string;
    status?: number;
    code?: string;
    message?: string;
  };
  if (anyError.name === "AbortError") return false;
  if (anyError instanceof EmptyReplyError) return true;
  const status = Number(anyError.status);
  if (
    status === 402 ||
    status === 404 ||
    status === 408 ||
    status === 413 ||
    status === 429 ||
    status >= 500
  )
    return true;
  return /\b(402|404|408|429|500|502|503|504)\b|overloaded|high demand|unavailable|quota|rate.?limit|resource.?exhausted|no endpoints|not found|is not supported|deprecated|insufficient credits|timed? ?out|timeout|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|network|circuit|empty reply|Failed to parse stream|request too large|tokens per minute|context.?length|is unavailable: its provider|tool call validation failed|not in request.tools/i.test(
    String(anyError.message || anyError.code || ""),
  );
}

/**
 * The next model to try after `failed`: the smartest model in QUALITY that
 * has not failed in this turn (and can read the attachments, if any). A
 * paid or unlisted model that fails starts from the top of the ranking.
 * Image and video models have no text reserve.
 */
export function nextReserve(
  failed: string,
  tried: Set<string>,
  options: { needsVision?: boolean } = {},
) {
  if (/dall-e|kling|imagen|veo|flux|leonardo|-image/i.test(failed)) return null;
  if (tried.size > MAX_RESERVES) return null;
  return (
    QUALITY.find(
      (model) =>
        model !== failed &&
        !tried.has(model) &&
        (!options.needsVision || seesImages(model)),
    ) || null
  );
}

/** The quiet route line above the answer: who answered and why. */
export function reserveRoute(
  original: string,
  reserve: string,
  cost: number,
  originalCost: number,
  route?: RouteDecision,
  reason?: string,
): RouteDecision {
  const label = labelOf(reserve);
  const from = route?.label || labelOf(original);
  return {
    ...(route || {
      category: "general",
      categoryLabel: "Chat",
      preference: "balanced",
      search: false,
      signals: [],
      alternatives: [],
    }),
    model: reserve,
    label,
    cost,
    reason:
      reason ||
      `${from} is not responding right now, so ${label} answered instead. You can ask ${from} again from here.`,
    signals: [
      ...(route?.signals || []).slice(0, 3),
      "reserve: provider unavailable",
    ],
    alternatives: [
      { model: original, label: from, cost: originalCost },
      ...(route?.alternatives || []).filter(
        (option) => option.model !== reserve && option.model !== original,
      ),
    ].slice(0, 3),
  };
}
