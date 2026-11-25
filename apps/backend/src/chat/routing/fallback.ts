import { labelOf, type RouteDecision } from "./model-router";

/**
 * Reserve models: when a provider fails before the first word of an answer
 * (an outage, a quota, a removed model, a timeout or an empty reply), the turn
 * moves on to the next model in the chain instead of showing an error.
 *
 * Gemini is free on our key and answers most things well; OpenRouter's free
 * models are a separate provider, so one outage never takes both down.
 */
const GEMINI_RESERVES = [
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
  "google/gemini-3.5-flash-lite",
];
const OPENROUTER_RESERVES = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "google/gemma-4-31b-it:free",
];
/** Reserves that can read images and PDFs attached to the turn. */
const SEES_FILES = new Set([
  ...GEMINI_RESERVES,
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-super-vl:free",
]);
const MAX_RESERVES = 3;

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
    status === 429 ||
    status >= 500
  )
    return true;
  return /\b(402|404|408|429|500|502|503|504)\b|overloaded|high demand|unavailable|quota|rate.?limit|resource.?exhausted|no endpoints|not found|is not supported|deprecated|insufficient credits|timed? ?out|timeout|fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|socket hang up|network|circuit|empty reply|Failed to parse stream/i.test(
    String(anyError.message || anyError.code || ""),
  );
}

const providerOf = (model: string) =>
  model.startsWith("google/gemini") ? "gemini" : "openrouter";

/**
 * The next model to try after `failed`: other Gemini models first when an
 * OpenRouter model failed and the other way round, so a provider-wide outage
 * is skipped at once. Image and video models have no reserve.
 */
export function nextReserve(
  failed: string,
  tried: Set<string>,
  options: { needsVision?: boolean } = {},
) {
  if (/dall-e|kling|imagen|veo|-image/i.test(failed)) return null;
  if (tried.size > MAX_RESERVES) return null;
  const usable = (model: string) =>
    model !== failed &&
    !tried.has(model) &&
    (!options.needsVision || SEES_FILES.has(model));
  if (providerOf(failed) === "openrouter")
    return [...GEMINI_RESERVES, ...OPENROUTER_RESERVES].find(usable) || null;
  // Each Gemini model has its own quota, so one more is worth a try; after
  // two Gemini failures the provider itself is likely down: cross over.
  const geminiFailures = [...new Set([failed, ...tried])].filter(
    (model) => providerOf(model) === "gemini",
  ).length;
  const order =
    geminiFailures >= 2
      ? [...OPENROUTER_RESERVES, ...GEMINI_RESERVES]
      : [...GEMINI_RESERVES, ...OPENROUTER_RESERVES];
  return order.find(usable) || null;
}

/** The quiet route line above the answer: who answered and why. */
export function reserveRoute(
  original: string,
  reserve: string,
  cost: number,
  originalCost: number,
  route?: RouteDecision,
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
    reason: `${from} is not responding right now, so ${label} answered instead. You can ask ${from} again from here.`,
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
