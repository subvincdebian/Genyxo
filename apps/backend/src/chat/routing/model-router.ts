/**
 * Auto mode: picks a model for each message from what the message asks for.
 *
 * Deterministic on purpose: the composer previews the route while the user
 * types and the server routes the same message the same way when it is sent,
 * so the model and price the user saw are the ones they get.
 */

export const AUTO_MODEL = "auto";

export type RouteCategory =
  | "image"
  | "video"
  | "code"
  | "reasoning"
  | "search"
  | "files"
  | "writing"
  | "translate"
  | "quick"
  | "general";

export type RoutePreference = "economy" | "balanced" | "quality";

export interface RouteAlternative {
  model: string;
  label: string;
  cost: number;
}

export interface RouteDecision {
  model: string;
  label: string;
  category: RouteCategory;
  categoryLabel: string;
  reason: string;
  signals: string[];
  cost: number;
  preference: RoutePreference;
  /** The turn runs with web search on (current events). */
  search: boolean;
  /** Set when the preferred model was swapped for an affordable one. */
  downgradedFrom?: RouteAlternative;
  /** The balance does not cover even the chosen model (image and video). */
  shortfall?: number;
  alternatives: RouteAlternative[];
}

export interface RouteInput {
  text: string;
  files?: { mime_type?: string; name?: string }[];
  mode?: "search" | "research";
  preference?: RoutePreference;
  balance?: number;
  costOf: (model: string) => number | undefined;
}

export const MODEL_LABELS: Record<string, string> = {
  "google/gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "google/gemini-3.5-flash": "Gemini 3.5 Flash",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-3.1-flash-lite": "Gemini 3.1 Flash",
  "anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
  "anthropic/claude-opus-4.6": "Claude Opus 4.6",
  "anthropic/claude-haiku-4.5": "Claude Haiku 4.5",
  "openai/gpt-5.1": "ChatGPT-5.1",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-4.1": "ChatGPT-4.1",
  "openai/o3-reasoning": "ChatGPT-o3 Reasoning",
  "openai/dall-e-3": "DALL·E 3",
  "kling-video": "Kling Video",
  "nvidia/nemotron-3-ultra-550b-a55b:free": "Nemotron 3 Ultra",
  "nvidia/nemotron-3.5-super-vl:free": "Nemotron 3.5 Super",
  "google/gemma-4-31b-it:free": "Gemma 4",
  "groq/openai/gpt-oss-120b": "GPT-OSS 120B",
  "groq/openai/gpt-oss-20b": "GPT-OSS 20B",
  "groq/qwen/qwen3.8-27b": "Qwen 3.8",
};

export const labelOf = (model: string) => MODEL_LABELS[model] || model;

const CATEGORY_LABELS: Record<RouteCategory, string> = {
  image: "Image",
  video: "Video",
  code: "Coding",
  reasoning: "Reasoning & math",
  search: "Live information",
  files: "Files & vision",
  writing: "Writing",
  translate: "Translation",
  quick: "Quick answer",
  general: "General",
};

/** Models per task, cheapest first: economy, balanced, quality. */
const TABLE: Record<RouteCategory, [string, string, string]> = {
  image: ["openai/dall-e-3", "openai/dall-e-3", "openai/dall-e-3"],
  video: ["kling-video", "kling-video", "kling-video"],
  code: [
    "google/gemini-3.5-flash",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.6",
  ],
  reasoning: [
    "google/gemini-3.5-flash",
    "openai/gpt-5-mini",
    "openai/o3-reasoning",
  ],
  search: [
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
  ],
  files: [
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
  ],
  writing: [
    "google/gemini-3.5-flash",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.6",
  ],
  translate: [
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
    "openai/gpt-4.1",
  ],
  quick: [
    "google/gemini-3.5-flash-lite",
    "google/gemini-3.5-flash-lite",
    "google/gemini-3.5-flash",
  ],
  general: [
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash",
    "openai/gpt-5.1",
  ],
};

const REASONS: Record<RouteCategory, (label: string) => string> = {
  image: (m) => `You asked for a picture, so ${m} draws it.`,
  video: (m) => `You asked for a video, so ${m} generates the clip.`,
  code: (m) =>
    `${m} is the strongest pick for writing, reading and fixing code.`,
  reasoning: (m) =>
    `${m} thinks step by step, which suits math, logic and careful analysis.`,
  search: (m) =>
    `This needs up-to-date facts, so ${m} answers with live web search.`,
  files: (m) =>
    `${m} reads PDFs and images natively and handles long documents.`,
  writing: (m) =>
    `${m} writes with a natural voice and follows tone and structure closely.`,
  translate: (m) =>
    `${m} translates quickly and keeps the meaning and tone of the original.`,
  quick: (m) => `A short question gets a fast, free answer from ${m}.`,
  general: (m) => `${m} is a fast all-rounder for everyday questions.`,
};

type Rule = {
  category: RouteCategory;
  label: string;
  pattern: RegExp;
  weight: number;
};

// English and Russian cues; each match adds its weight to the category.
const RULES: Rule[] = [
  {
    category: "image",
    label: "asks for an image",
    weight: 6,
    pattern:
      /\b(draw|paint|sketch|generate|create|make|design|render)\b[^.?!\n]{0,40}\b(image|picture|photo|illustration|logo|poster|icon|wallpaper|artwork|drawing|avatar)s?\b|(нарисуй|изобрази)|(сгенерируй|создай|сделай)[^.?!\n]{0,30}(картин|изображен|рисун|логотип|фото|постер|аватар)/iu,
  },
  {
    category: "video",
    label: "asks for a video",
    weight: 6,
    pattern:
      /\b(generate|create|make|render|animate)\b[^.?!\n]{0,40}\b(video|clip|animation|footage)s?\b|(сгенерируй|создай|сделай|сними)[^.?!\n]{0,30}(видео|ролик|анимаци)/iu,
  },
  {
    category: "code",
    label: "contains code",
    weight: 5,
    pattern:
      /```|^\s{4}\S|=>|\bconst\s|\bdef\s\w+\(|\bfunction\s*\w*\(|<\/?[a-z]+[^>]*>|;\s*$/m,
  },
  {
    category: "code",
    label: "programming terms",
    weight: 3,
    pattern:
      /\b(code|coding|bug|debug|refactor|compile|stack ?trace|exception|function|class|method|api|endpoint|regex|sql|query|typescript|javascript|python|java|golang|rust|c\+\+|c#|kotlin|swift|react|next\.?js|node|css|html|docker|kubernetes|git|npm|unit test|algorithm)\b|(код|функци|баг|ошибк[аиу] в|скрипт|программ|рефактор|алгоритм|компил)/iu,
  },
  {
    category: "reasoning",
    label: "math or logic",
    weight: 4,
    pattern:
      /\b(prove|proof|solve|equation|integral|derivative|probability|theorem|calculate|compute|optimi[sz]e|step[- ]by[- ]step|logic puzzle|riddle)\b|(реши|докажи|уравнени|интеграл|производн|вероятност|вычисли|посчитай|задач[аиу])|\d+\s*[-+*/^×÷]\s*\d+/iu,
  },
  {
    category: "reasoning",
    label: "asks for analysis",
    weight: 2,
    pattern:
      /\b(analy[sz]e|compare|trade-?offs?|pros and cons|evaluate|strategy|why does|explain why)\b|(проанализируй|сравни|плюсы и минусы|стратеги|почему)/iu,
  },
  {
    category: "search",
    label: "needs current information",
    weight: 5,
    pattern:
      /\b(latest|today|tonight|yesterday|this (week|month|year)|right now|currently|news|breaking|price of|stock|exchange rate|weather|forecast|score|who won|release date|20(2[5-9]|3\d))\b|(новост|сегодня|вчера|сейчас|на этой неделе|актуальн|последн(ие|яя|ий)|курс|погод|цена на|сколько стоит|кто выиграл)/iu,
  },
  {
    category: "search",
    label: "mentions a link",
    weight: 3,
    pattern: /https?:\/\/\S+/i,
  },
  {
    category: "writing",
    label: "writing task",
    weight: 3,
    pattern:
      /\b(write|draft|compose|rewrite|rephrase|proofread|polish|essay|email|letter|cover letter|story|poem|blog|article|post|speech|slogan|tagline|summar(y|i[sz]e))\b|(напиши|сочини|составь|перепиши|отредактируй|эссе|письм|стать|рассказ|стих|пост|речь|слоган|резюме|кратко изложи)/iu,
  },
  {
    category: "translate",
    label: "asks for a translation",
    weight: 6,
    pattern:
      /\b(translate|translation|in (english|spanish|french|german|russian|chinese|japanese))\b|(переведи|перевод|на английск|на русск|на немецк|на испанск)/iu,
  },
];

const PRIORITY: RouteCategory[] = [
  "image",
  "video",
  "translate",
  "code",
  "search",
  "reasoning",
  "writing",
];

const isRich = (mime = "") =>
  mime.startsWith("image/") || mime === "application/pdf";

export function routeModel(input: RouteInput): RouteDecision {
  const text = (input.text || "").trim();
  const preference = input.preference || "balanced";
  const scores = new Map<RouteCategory, number>();
  const signals: string[] = [];
  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    scores.set(rule.category, (scores.get(rule.category) || 0) + rule.weight);
    if (!signals.includes(rule.label)) signals.push(rule.label);
  }

  const files = input.files || [];
  let category: RouteCategory | undefined;
  if (input.mode) {
    category = "search";
    signals.unshift(
      input.mode === "research" ? "Deep research is on" : "Web search is on",
    );
  }
  if (!category) {
    let best = 0;
    for (const name of PRIORITY) {
      const score = scores.get(name) || 0;
      if (score > best) {
        best = score;
        category = name;
      }
    }
  }
  // Pictures and PDFs need a model that reads them, unless the user is asking
  // for a new image or video, or clearly about code.
  if (
    files.some((file) => isRich(file.mime_type)) &&
    category !== "image" &&
    category !== "video" &&
    !(category === "code" && (scores.get("code") || 0) >= 5)
  ) {
    category = "files";
    signals.unshift(
      `${files.length} attachment${files.length === 1 ? "" : "s"} to read`,
    );
  } else if (files.length && !category) {
    category = "files";
    signals.unshift("attached files");
  }
  if (!category) {
    const words = text.split(/\s+/).filter(Boolean).length;
    category = words <= 12 && text.length <= 90 ? "quick" : "general";
    signals.push(category === "quick" ? "short question" : "everyday question");
  }

  const cost = (model: string) => input.costOf(model) ?? 0;
  const tier = preference === "economy" ? 0 : preference === "quality" ? 2 : 1;
  const preferred = TABLE[category][tier];
  let model = preferred;
  let downgradedFrom: RouteAlternative | undefined;
  const balance = input.balance;
  if (balance !== undefined && cost(model) > balance) {
    // Step down to the best option the balance covers.
    const affordable = [...TABLE[category]]
      .slice(0, tier)
      .reverse()
      .find((option) => cost(option) <= balance);
    if (affordable) {
      downgradedFrom = { model, label: labelOf(model), cost: cost(model) };
      model = affordable;
    }
  }
  const label = labelOf(model);
  const shortfall =
    balance !== undefined && cost(model) > balance
      ? cost(model) - balance
      : undefined;

  const alternatives = [...new Set(TABLE[category])]
    .filter((option) => option !== model)
    .map((option) => ({
      model: option,
      label: labelOf(option),
      cost: cost(option),
    }));
  // Always offer one free and one top model to compare against.
  for (const extra of [
    "google/gemini-3.5-flash",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5.1",
  ]) {
    if (category === "image" || category === "video") break;
    if (extra !== model && !alternatives.some((item) => item.model === extra))
      alternatives.push({
        model: extra,
        label: labelOf(extra),
        cost: cost(extra),
      });
    if (alternatives.length >= 3) break;
  }

  const reason = downgradedFrom
    ? `${label} handles ${CATEGORY_LABELS[category].toLowerCase()} well${cost(model) ? "" : " for free"}. ${downgradedFrom.label} would fit best but needs ${downgradedFrom.cost} credits.`
    : REASONS[category](label);

  return {
    model,
    label,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    reason,
    signals: signals.slice(0, 4),
    cost: cost(model),
    preference,
    search: category === "search",
    downgradedFrom,
    shortfall,
    alternatives: alternatives.slice(0, 3),
  };
}

const RESERVES = [
  "google/gemini-2.5-flash",
  "google/gemini-3.5-flash-lite",
  "google/gemini-3.1-flash-lite",
];

/** A free Gemini model to fall back to when Auto's pick is overloaded. */
export function autoFailover(
  route: RouteDecision | undefined,
  failedModel: string,
  error: unknown,
): { model: string; route: RouteDecision } | null {
  if (!route) return null;
  const message = String((error as Error)?.message || "");
  if (
    !/\b(503|429|500)\b|overloaded|high demand|unavailable|quota|aborted when fetching|timed? ?out|fetch failed|ECONNRESET/i.test(
      message,
    )
  )
    return null;
  const failed = failedModel.startsWith("google/")
    ? failedModel
    : `google/${failedModel}`;
  const model = RESERVES.find((option) => option !== failed);
  if (!model) return null;
  const label = labelOf(model);
  return {
    model,
    route: {
      ...route,
      model,
      label: label,
      cost: 0,
      reason: `${route.label} was busy, so Auto switched to ${label} to answer right away.`,
      signals: [...route.signals.slice(0, 3), "switched: model busy"],
      alternatives: [
        { model: route.model, label: route.label, cost: route.cost },
        ...route.alternatives.filter((option) => option.model !== model),
      ].slice(0, 3),
    },
  };
}
