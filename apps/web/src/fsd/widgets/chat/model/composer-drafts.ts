/** A plugin, skill or map place mentioned with "@" in the message. */
export type MentionChip = { kind: "plugin" | "skill" | "place"; id: string; name: string; lat?: number; lng?: number; address?: string };
export type ComposerDraft = { text: string; mentions: MentionChip[]; savedAt: number };

const PREFIX = "genyxo:draft:";
const TTL = 24 * 60 * 60 * 1000;

/** One draft per user and conversation; "new" is the empty New chat composer. */
export const draftKey = (userId: number | null, conversationId: number | string | null) => `${PREFIX}${userId ?? "guest"}:${conversationId ?? "new"}`;

export function readDraft(key: string): ComposerDraft | null {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || "null") as ComposerDraft | null;
    if (!draft || typeof draft.text !== "string" || !Array.isArray(draft.mentions)) return null;
    if (Date.now() - draft.savedAt > TTL) { localStorage.removeItem(key); return null; }
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, text: string, mentions: MentionChip[]) {
  try {
    if (!text.trim() && !mentions.length) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify({ text, mentions, savedAt: Date.now() } satisfies ComposerDraft));
  } catch {
    // Private windows and full storage only lose the draft.
  }
}

export function pruneDrafts() {
  try {
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX)) readDraft(key);
    }
  } catch {
    // Storage may be blocked; nothing to prune then.
  }
}

export type MentionRange = { start: number; end: number; chip: MentionChip };

/** Where each picked "@Name" sits in the text; longer names win where names overlap. */
export function mentionRanges(value: string, mentions: MentionChip[]): MentionRange[] {
  const ranges: MentionRange[] = [];
  const chips = [...mentions].sort((a, b) => b.name.length - a.name.length);
  for (const chip of chips) {
    const token = `@${chip.name}`;
    for (let index = value.indexOf(token); index !== -1; index = value.indexOf(token, index + token.length)) {
      const end = index + token.length;
      if (ranges.some((range) => index < range.end && end > range.start)) continue;
      ranges.push({ start: index, end, chip });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

/** The "@query" or "/query" the caret sits in. "/" only counts at the start of the message, as in ChatGPT. */
export function findTrigger(value: string, caret: number): { char: "@" | "/"; start: number; query: string } | null {
  const before = value.slice(0, caret);
  const match = /(^|\s)([@/])([^\s@/]{0,40})$/.exec(before);
  if (!match) return null;
  const char = match[2] as "@" | "/";
  const start = caret - match[3].length - 1;
  if (char === "/" && before.slice(0, start).trim()) return null;
  return { char, start, query: match[3] };
}
