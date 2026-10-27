import type { WebResult, WebSearchService } from "./web-search.service";

/**
 * Built-in web tools: any text model can search the web and read pages, and
 * every page it used is listed under the answer as a Sources card.
 */
interface WebTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, any>;
}

const TOOLS: WebTool[] = [
  {
    name: "genyxo_web_search",
    label: "Searching the web",
    description:
      "Search the web for current or specific information (news, prices, versions, events, facts you are unsure of). Returns titles, links and snippets.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query, as you would type it into a search engine",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "genyxo_read_page",
    label: "Reading a page",
    description:
      "Read the text of a web page (a result from genyxo_web_search or a link the user gave) to answer from its details.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The page's full http(s) URL" },
      },
      required: ["url"],
    },
  },
];

export const isWebTool = (name: string) =>
  TOOLS.some((tool) => tool.name === name);
export const webGeminiDeclarations = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
export const webOpenAiTools = () =>
  TOOLS.map(({ name, description, parameters }) => ({
    type: "function" as const,
    function: { name, description, parameters },
  }));

export function webPrompt(forced: boolean) {
  return forced
    ? "Web search is on for this message: call genyxo_web_search first (several focused queries if needed), read the most relevant pages with genyxo_read_page, and answer from them. Cite sources inline as Markdown links [title](url). Do not invent sources."
    : "You can search the web (genyxo_web_search) and read pages (genyxo_read_page). Use them only when the question needs current, local or niche facts you are not sure of, then cite the pages inline as Markdown links [title](url).";
}

export type Source = { title: string; url: string };
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
export const activityFor = (name: string, args: Record<string, any>) =>
  name === "genyxo_web_search" && args.query
    ? `Searching “${String(args.query).slice(0, 80)}”`
    : name === "genyxo_read_page" && args.url
      ? `Reading ${hostOf(String(args.url))}`
      : TOOLS.find((tool) => tool.name === name)?.label || "Using the web";

/** Runs a web tool; pages read and results found are added to `sources`. */
export async function runWebTool(
  service: WebSearchService,
  name: string,
  args: Record<string, any>,
  sources: Source[],
  language?: string,
) {
  const add = (source: Source) => {
    if (!sources.some((item) => item.url === source.url)) sources.push(source);
  };
  try {
    if (name === "genyxo_web_search") {
      const query = String(args.query || "").trim();
      if (!query) return { error: "Invalid arguments: query is required" };
      const results = await service.search(query, 6, language);
      return results.length
        ? {
            results: results.map((result: WebResult, index) => ({
              n: index + 1,
              ...result,
            })),
          }
        : { results: [], note: "No results. Try different words." };
    }
    if (name === "genyxo_read_page") {
      const page = await service.read(String(args.url || ""));
      add({ title: page.title, url: page.url });
      return { title: page.title, url: page.url, text: page.text };
    }
    return { error: "Unknown web tool" };
  } catch (error: any) {
    return {
      error: String(error?.message || "The web is unavailable right now").slice(
        0,
        200,
      ),
    };
  }
}

/** The Sources card under an answer. */
export const sourcesFence = (sources: Source[]) =>
  `\n\n\`\`\`genyxo-sources\n${JSON.stringify({ sources: sources.slice(0, 20) })}\n\`\`\`\n`;

const FENCE = /```genyxo-(sources|memory)\n(\{.*\})\n```/g;
/** Later turns see one line instead of the cards' data. */
export function describeWebFences(content: string) {
  if (
    !content.includes("```genyxo-sources") &&
    !content.includes("```genyxo-memory")
  )
    return content;
  return content.replace(FENCE, (_match, kind: string, json: string) => {
    try {
      const card = JSON.parse(json);
      return kind === "sources"
        ? `[Sources: ${(card.sources || []).map((source: Source) => source.url).join(", ")}]`
        : `[Memory ${card.action}: ${card.fact}]`;
    } catch {
      return "";
    }
  });
}
