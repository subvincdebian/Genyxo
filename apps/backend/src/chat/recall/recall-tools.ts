import type { RecallService } from "./recall.service";

/**
 * Lets any model look through the user's earlier chats ("what did we decide
 * about payments last month?") and link to the messages it used.
 */
const TOOL = {
  name: "genyxo_search_chats",
  description:
    'Search the user\'s earlier chats. Use it when the user refers to something discussed before ("what did we decide…", "find the chat where…", "remind me what you said about…"). Put any time span in the query in words, e.g. "payment terms last month".',
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          "What to look for, with the time span if the user gave one",
      },
    },
    required: ["query"],
  },
};

export const isRecallTool = (name: string) => name === TOOL.name;
export const recallActivity = () => "Searching your chats";
export const recallGeminiDeclarations = () => [TOOL];
export const recallOpenAiTools = () => [
  {
    type: "function" as const,
    function: TOOL,
  },
];

export const RECALL_PROMPT =
  "You can search the user's earlier chats with genyxo_search_chats when they refer to a past conversation. Base the answer on the returned excerpts and link each chat you rely on as a markdown link with its title and the given url, e.g. [Payment terms](/c/…?chat=1&m=2). If nothing relevant is found, say so.";

export async function runRecallTool(
  recall: RecallService,
  userId: number,
  args: Record<string, unknown>,
  conversationId: number,
) {
  const query = (typeof args.query === "string" ? args.query : "")
    .slice(0, 300)
    .trim();
  if (!query) return { error: "Invalid arguments: query is required" };
  try {
    const { hits, range } = await recall.search(userId, query, {
      excludeConversationId: conversationId,
      limit: 8,
    });
    return {
      range: range || "any time",
      results: hits.map((hit) => ({
        chat: hit.title,
        date: hit.createdAt.slice(0, 10),
        from: hit.sender === "user" ? "user" : "assistant",
        excerpt: hit.snippet,
        url: hit.url,
      })),
    };
  } catch (error) {
    return {
      error: String(
        (error as Error).message || "Chat search is unavailable",
      ).slice(0, 200),
    };
  }
}
