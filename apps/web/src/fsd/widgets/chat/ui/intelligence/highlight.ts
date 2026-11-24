/**
 * Underlines a fact-checked quote inside a rendered answer. Quotes come from
 * the Markdown source, so matching ignores Markdown marks, spacing and case,
 * and a quote may span bold text, links and other inline elements.
 */

const SKIP = "pre, code, button, .gx-rich-slot, .gx-map-card-slot, .gx-media-card, .gx-file-card, .action-card, a.gx-cite, .katex, svg";
const MARKUP = /[*_`#>~]/;

type Piece = { node: Text; start: number };

function textPieces(root: HTMLElement) {
  const pieces: Piece[] = [];
  let text = "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest(SKIP) || !node.nodeValue ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    pieces.push({ node, start: text.length });
    text += node.nodeValue;
  }
  return { pieces, text };
}

/** Lower-cased text with collapsed spaces, mapped back to original offsets. */
function normalize(text: string, dropMarkup = false) {
  let out = "";
  const map: number[] = [];
  let space = true;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (dropMarkup && MARKUP.test(char)) continue;
    if (/\s/.test(char)) {
      if (space) continue;
      space = true;
      out += " ";
    } else {
      space = false;
      out += char.toLowerCase();
    }
    map.push(index);
  }
  return { out: out.trimEnd(), map };
}

export function findQuote(root: HTMLElement, quote: string) {
  const { pieces, text } = textPieces(root);
  const haystack = normalize(text);
  const needle = normalize(quote, true).out.trim();
  if (needle.length < 6) return null;
  const at = haystack.out.indexOf(needle);
  // Models sometimes trim or alter the ends of a quote; fall back to its core.
  if (at < 0 && needle.length > 40) {
    const core = needle.slice(Math.floor(needle.length * 0.15), Math.ceil(needle.length * 0.85));
    const coreAt = haystack.out.indexOf(core);
    if (coreAt >= 0) return range(pieces, haystack.map[coreAt], haystack.map[coreAt + core.length - 1] + 1);
  }
  if (at < 0) return null;
  return range(pieces, haystack.map[at], haystack.map[at + needle.length - 1] + 1);
}

function range(pieces: Piece[], start: number, end: number) {
  return { pieces, start, end };
}

/** Wraps the quote in <mark> elements (one per text node it crosses). */
export function markQuote(root: HTMLElement, quote: string, attributes: Record<string, string>) {
  const found = findQuote(root, quote);
  if (!found) return [] as HTMLElement[];
  const marks: HTMLElement[] = [];
  for (const { node, start } of found.pieces) {
    const length = node.nodeValue!.length;
    const from = Math.max(found.start, start) - start;
    const to = Math.min(found.end, start + length) - start;
    if (to <= 0 || from >= length || to <= from) continue;
    let target = node;
    if (from > 0) target = target.splitText(from);
    if (to - from < target.nodeValue!.length) target.splitText(to - from);
    if (!target.nodeValue!.trim()) continue;
    const mark = document.createElement("mark");
    mark.className = "gx-claim";
    Object.entries(attributes).forEach(([name, value]) => mark.setAttribute(name, value));
    target.replaceWith(mark);
    mark.appendChild(target);
    marks.push(mark);
  }
  marks.forEach((mark, index) => {
    mark.dataset.part = marks.length === 1 ? "only" : index === 0 ? "first" : index === marks.length - 1 ? "last" : "middle";
  });
  return marks;
}

/** Removes every underline added to this answer. */
export function clearMarks(root: HTMLElement) {
  root.querySelectorAll("mark.gx-claim").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
}
