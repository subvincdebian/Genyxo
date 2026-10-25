/**
 * Proposed write actions travel inside the bot reply as a fenced block the chat
 * renders as a confirmation card:
 *
 * ```genyxo-action
 * {"id":"…","plugin":"gmail","title":"Send email","fields":[…],"status":"pending"}
 * ```
 *
 * The JSON stays on one line so a body containing backticks cannot close the fence.
 */
export const ACTION_FENCE = "genyxo-action";

export interface ActionCard {
  id: string;
  plugin: string;
  pluginName: string;
  title: string;
  fields: { label: string; value: string }[];
  body?: string;
  bodyTruncated?: boolean;
  status: string;
  result?: { summary: string; url?: string };
  error?: string;
}

const FENCE = new RegExp("```" + ACTION_FENCE + "\\n(\\{.*\\})\\n```", "g");
const CARD_BODY_LIMIT = 4000;

// U+2028/U+2029 end a line for the fence pattern, so they become spaces.
const LINE_SEPARATORS = new RegExp("[\\u2028\\u2029]", "g");

export function actionFence(card: ActionCard): string {
  const body =
    card.body && card.body.length > CARD_BODY_LIMIT
      ? card.body.slice(0, CARD_BODY_LIMIT)
      : card.body;
  const json = JSON.stringify({
    ...card,
    body,
    bodyTruncated: Boolean(card.body && card.body !== body) || undefined,
  });
  return [
    "",
    "",
    "```" + ACTION_FENCE,
    json.replace(LINE_SEPARATORS, " "),
    "```",
    "",
    "",
  ].join("\n");
}

/** Rewrites one card in stored message text, e.g. after the user confirms it. */
export function updateActionFence(
  content: string,
  id: string,
  patch: Partial<ActionCard>,
): string {
  return content.replace(FENCE, (match, json: string) => {
    try {
      const card = JSON.parse(json) as ActionCard;
      return card.id === id
        ? `\`\`\`${ACTION_FENCE}\n${JSON.stringify({ ...card, ...patch })}\n\`\`\``
        : match;
    } catch {
      return match;
    }
  });
}

/** Models see a short note instead of the card markup in later turns. */
export function describeActionFences(content: string): string {
  if (!content.includes(ACTION_FENCE)) return content;
  return content.replace(FENCE, (_match, json: string) => {
    try {
      const card = JSON.parse(json) as ActionCard;
      const outcome =
        card.status === "done"
          ? `confirmed and completed${card.result?.summary ? `: ${card.result.summary}` : ""}`
          : card.status === "cancelled"
            ? "cancelled by the user"
            : card.status === "failed"
              ? `failed: ${card.error || "error"}`
              : "waiting for the user's confirmation";
      return `[${card.pluginName} action "${card.title}" — ${outcome}]`;
    } catch {
      return "[Plugin action card]";
    }
  });
}
