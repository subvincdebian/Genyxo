import type {
  WebPage,
  WebResult,
  WebSearchService,
} from "./web-search.service";
import type { Source } from "./web-tools";

/**
 * Deep research: plan focused searches, read the best pages, look once more
 * for gaps, then write a sourced report. Each step is reported as activity so
 * the thinking orb narrates the work ("Searching…", "Reading nature.com…").
 */
export type ResearchContext = {
  question: string;
  /** Earlier turns of the chat, so follow-up questions keep their context. */
  history?: string;
  language?: string;
  search: WebSearchService;
  /** One non-streamed model answer. */
  complete: (system: string, prompt: string) => Promise<string>;
  /** The streamed report; tokens go to the user as they arrive. */
  stream: (system: string, prompt: string) => Promise<void>;
  step: (label: string) => void | Promise<void>;
  signal: AbortSignal;
};

const MAX_QUERIES = 5;
const MAX_PAGES = 7;
const PAGE_CHARS = 7000;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Parses {"queries": [...]} out of a model answer, tolerating code fences and prose. */
export function parseQueries(text: string, fallback: string): string[] {
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  if (json)
    try {
      const parsed = JSON.parse(json).queries;
      // A JSON list, even an empty one ("no gaps"), is the model's real answer.
      if (Array.isArray(parsed))
        return [
          ...new Set<string>(
            parsed
              .map((query: unknown) => String(query).trim())
              .filter(Boolean),
          ),
        ].slice(0, MAX_QUERIES);
    } catch {
      /* Fall back to reading lines below. */
    }
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*\d.)"]+|["\s]+$/g, ""))
    .filter((line) => line.length > 3 && line.length < 160);
  return lines.length ? lines.slice(0, MAX_QUERIES) : [fallback];
}

/** Prefers one page per site and drops results already chosen. */
export function pickPages(
  results: WebResult[],
  taken: Set<string>,
  limit: number,
) {
  const hosts = new Set([...taken].map(hostOf));
  const picked: WebResult[] = [];
  for (const result of results) {
    if (picked.length >= limit) break;
    if (taken.has(result.url) || hosts.has(hostOf(result.url))) continue;
    hosts.add(hostOf(result.url));
    picked.push(result);
  }
  return picked;
}

async function readAll(context: ResearchContext, results: WebResult[]) {
  const pages: WebPage[] = [];
  for (let index = 0; index < results.length; index += 3) {
    if (context.signal.aborted) break;
    const batch = results.slice(index, index + 3);
    for (const result of batch)
      await context.step(`Reading ${hostOf(result.url)}`);
    const read = await Promise.all(
      batch.map((result) =>
        context.search.read(result.url, PAGE_CHARS).catch(() => null),
      ),
    );
    read.forEach((page, offset) => {
      // A page that could not be read still counts with its search snippet.
      pages.push(
        page || {
          title: batch[offset].title,
          url: batch[offset].url,
          text: batch[offset].snippet,
        },
      );
    });
  }
  return pages.filter((page) => page.text.trim().length > 40);
}

export async function deepResearch(
  context: ResearchContext,
): Promise<Source[]> {
  const language = context.language
    ? ` The user writes in "${context.language}".`
    : "";
  await context.step("Planning the research");
  const plan = await context.complete(
    'You plan web research. Reply only with JSON: {"queries": ["…"]} — 3 to 5 focused, varied search queries that together cover the question (facts, recent news, expert views, numbers). Use English, and add queries in the user\'s language when the topic is local.',
    `${context.history ? `Conversation so far:\n${context.history}\n\n` : ""}Question: ${context.question}${language}`,
  );
  const queries = parseQueries(plan, context.question);

  const results: WebResult[] = [];
  for (const query of queries) {
    if (context.signal.aborted) break;
    await context.step(`Searching “${query.slice(0, 80)}”`);
    for (const result of await context.search
      .search(query, 6, context.language)
      .catch(() => []))
      if (!results.some((item) => item.url === result.url))
        results.push(result);
  }
  const taken = new Set<string>();
  let pages = await readAll(context, pickPages(results, taken, MAX_PAGES - 2));
  pages.forEach((page) => taken.add(page.url));

  // One more pass for what the first round left open.
  if (!context.signal.aborted && pages.length) {
    await context.step("Looking for gaps");
    const gaps = await context
      .complete(
        'You review research notes. Reply only with JSON: {"queries": [...]} — at most 2 searches that would fill important gaps for the question, or {"queries": []} when the notes are enough.',
        `Question: ${context.question}\n\nNotes:\n${pages.map((page) => `- ${page.title}: ${page.text.slice(0, 600)}`).join("\n")}`,
      )
      .catch(() => "");
    const more: WebResult[] = [];
    for (const query of parseQueries(gaps, "").filter(Boolean).slice(0, 2)) {
      await context.step(`Searching “${query.slice(0, 80)}”`);
      more.push(
        ...(await context.search
          .search(query, 5, context.language)
          .catch(() => [])),
      );
    }
    const extra = await readAll(
      context,
      pickPages(more, taken, MAX_PAGES - pages.length),
    );
    pages = [...pages, ...extra];
  }

  const sources: Source[] = pages.map((page) => ({
    title: page.title || hostOf(page.url),
    url: page.url,
  }));
  await context.step("Writing the report");
  if (!pages.length) {
    await context.stream(
      "Explain briefly, in the user's language, that the web search found nothing usable for this question right now, and suggest how to rephrase it.",
      context.question,
    );
    return [];
  }
  const numbered = pages
    .map(
      (page, index) =>
        `[${index + 1}] ${page.title}\n${page.url}\n${page.text.slice(0, PAGE_CHARS)}`,
    )
    .join("\n\n---\n\n");
  await context.stream(
    [
      "You are a careful research analyst. Write a well-structured Markdown report that answers the question, in the user's language.",
      "Structure: a # title; a short **TL;DR** paragraph; ## sections with the findings (use tables when comparing things); ## Conclusion.",
      "Ground every claim in the numbered sources and cite them inline as [n](url) right after the claim. Say where sources disagree or are thin. Never invent sources, numbers or quotes.",
      "Do not add a separate source list at the end: it is shown to the user automatically.",
    ].join(" "),
    `${context.history ? `Conversation so far:\n${context.history}\n\n` : ""}Question: ${context.question}\n\nSources:\n\n${numbered}`,
  );
  return sources;
}
