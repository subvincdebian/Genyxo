/**
 * Turns document text into searchable passages that remember their page and
 * nearest heading, so an answer can cite "Contract.pdf, p. 4".
 */

export interface Passage {
  ordinal: number;
  page: number | null;
  heading: string | null;
  text: string;
}

const TARGET = 1400;
const OVERLAP = 180;

const tidy = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/** A markdown heading, or a short title-like line on its own. */
function headingOf(line: string) {
  const markdown = /^#{1,4}\s+(.{2,120})$/.exec(line.trim());
  if (markdown) return markdown[1].trim();
  const plain = line.trim();
  if (
    plain.length >= 3 &&
    plain.length <= 80 &&
    !/[.,;:!?]$/.test(plain) &&
    /^(\d+(\.\d+)*\.?\s+)?[\p{Lu}\d]/u.test(plain) &&
    plain.split(/\s+/).length <= 10
  )
    return plain;
  return null;
}

/** Splits pages (or one page-less text) into overlapping passages. */
export function chunkPages(pages: string[], paged: boolean): Passage[] {
  const passages: Passage[] = [];
  let heading: string | null = null;
  pages.forEach((raw, pageIndex) => {
    const text = tidy(raw);
    if (!text) return;
    let buffer = "";
    // Characters added since the last passage; the carried overlap alone is not one.
    let fresh = 0;
    let bufferHeading = heading;
    const flush = () => {
      const body = buffer.trim();
      if (body.length >= 20)
        passages.push({
          ordinal: passages.length,
          page: paged ? pageIndex + 1 : null,
          heading: bufferHeading ? bufferHeading.slice(0, 250) : null,
          text: body,
        });
      // The end of a passage starts the next, so a sentence split across the
      // boundary can still be found whole.
      buffer =
        body.length > OVERLAP ? body.slice(-OVERLAP).replace(/^\S*\s/, "") : "";
      fresh = 0;
      bufferHeading = heading;
    };
    const add = (piece: string, separator: string) => {
      if (fresh && buffer.length + piece.length > TARGET) flush();
      buffer += piece + separator;
      fresh += piece.length + separator.length;
    };
    for (const paragraph of text.split(/\n\s*\n|\n(?=#{1,4}\s)/)) {
      const firstLine = paragraph.trim().split("\n")[0] || "";
      const found = headingOf(firstLine);
      if (found && paragraph.trim().length < 140) {
        if (fresh > 40) flush();
        heading = found;
        bufferHeading = found;
      }
      if (paragraph.length > TARGET)
        // A long paragraph is split on sentences.
        paragraph
          .split(/(?<=[.!?])\s+/)
          .forEach((sentence) => add(sentence, " "));
      else add(paragraph, "\n\n");
    }
    if (fresh) flush();
  });
  return passages.map((passage, index) => ({ ...passage, ordinal: index }));
}

/** Search words for MySQL boolean full-text mode: prefixes catch word forms. */
export function fullTextQuery(question: string) {
  const words = question
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 && !STOP.has(word))
    .slice(0, 12)
    // Russian endings vary by case, so Cyrillic words search by their stem.
    .map((word) =>
      /[а-яё]/.test(word) && word.length > 5
        ? word.slice(0, Math.max(4, word.length - 2))
        : word,
    );
  return [...new Set(words)].map((word) => `${word}*`).join(" ");
}

const STOP = new Set(
  "the and for are was were what when where which who why how does did can could would should with about from that this have has into your you our they them their there these those than then also just only very will shall may must not but all any each its it's "
    .concat(
      "что как где когда кто почему какой какая какие это этот эта эти тот там тут мы вы ты они он она оно наш ваш мне меня нам нас был была были было есть про для или если чтобы тоже также уже еще ещё очень",
    )
    .split(" "),
);
