const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decodes HTML entities in a single pass, so "&amp;lt;" becomes the text
 * "&lt;" rather than being unescaped twice into "<".
 */
export function decodeEntities(text = ""): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, ref: string) => {
    if (ref[0] === "#") {
      const point =
        ref[1].toLowerCase() === "x"
          ? parseInt(ref.slice(2), 16)
          : Number(ref.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    }
    return NAMED[ref.toLowerCase()] ?? match;
  });
}

/** Applies a replacement until the text stops changing. */
function untilStable(text: string, pattern: RegExp, replacement: string) {
  let previous: string;
  do {
    previous = text;
    text = text.replace(pattern, replacement);
  } while (text !== previous);
  return text;
}

/**
 * Plain text from HTML or XML, for model context. Script and style bodies
 * go, paragraph and line breaks become newlines, and tags are removed until
 * none are left, so fragments like "<scr<script>ipt>" cannot reassemble into
 * a tag; an unterminated tag at the end is dropped too. Entities are decoded
 * once, last, so the result is text, never markup to render.
 */
export function htmlToText(html = ""): string {
  let text = untilStable(html, /<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");
  text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>/gi, "\n\n");
  text = untilStable(text, /<[^<>]*>/g, "");
  text = text.replace(/<[a-z!/?][^<>]*$/i, "");
  return decodeEntities(text)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
