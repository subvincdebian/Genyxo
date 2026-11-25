// Version history and word-level comparison for canvas documents.

export type VersionKind = "original" | "ai" | "edit" | "saved" | "restore";
export type Version = { id: string; at: number; label: string; kind: VersionKind; content: string };
export type DiffPart = { type: "same" | "added" | "removed"; text: string };

const MAX_VERSIONS = 40;

export const newVersion = (content: string, label: string, kind: VersionKind): Version => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
  at: Date.now(),
  label: label.trim().slice(0, 140) || "Version",
  kind,
  content,
});

/** Adds a version unless it repeats the latest one; keeps the original and the newest. */
export function pushVersion(versions: Version[], version: Version) {
  if (versions.length && versions[versions.length - 1].content === version.content) return versions;
  const next = [...versions, version];
  return next.length > MAX_VERSIONS ? [next[0], ...next.slice(next.length - MAX_VERSIONS + 1)] : next;
}

const tokens = (text: string) => text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) || [];

/** Longest-common-subsequence diff; falls back to lines for long texts. */
export function diff(before: string, after: string): DiffPart[] {
  let a = tokens(before);
  let b = tokens(after);
  if (a.length * b.length > 3_000_000) {
    a = lines(before);
    b = lines(after);
  }
  if (a.length * b.length > 12_000_000) return [{ type: "removed", text: before }, { type: "added", text: after }];
  // Trim the common head and tail so the table stays small.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
  const x = a.slice(head, a.length - tail);
  const y = b.slice(head, b.length - tail);
  const table = Array.from({ length: x.length + 1 }, () => new Uint32Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      table[i][j] = x[i] === y[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const parts: DiffPart[] = [];
  const add = (type: DiffPart["type"], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  if (head) add("same", a.slice(0, head).join(""));
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      add("same", x[i]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) add("removed", x[i++]);
    else add("added", y[j++]);
  }
  while (i < x.length) add("removed", x[i++]);
  while (j < y.length) add("added", y[j++]);
  if (tail) add("same", a.slice(a.length - tail).join(""));
  return readable(parts);
}

/**
 * Merges changes split by tiny unchanged bits (a space, a comma, "the") into
 * one deletion followed by one insertion, so a rewrite reads as phrases.
 */
function readable(parts: DiffPart[]): DiffPart[] {
  const out: DiffPart[] = [];
  let removed = "";
  let added = "";
  const flush = () => {
    if (removed) out.push({ type: "removed", text: removed });
    if (added) out.push({ type: "added", text: added });
    removed = "";
    added = "";
  };
  parts.forEach((part, index) => {
    const between = index > 0 && index < parts.length - 1 && parts[index - 1].type !== "same" && parts[index + 1].type !== "same";
    if (part.type === "same" && !(between && part.text.trim().length <= 3 && !part.text.includes("\n"))) {
      flush();
      out.push(part);
      return;
    }
    if (part.type === "same") {
      removed += part.text;
      added += part.text;
    } else if (part.type === "removed") removed += part.text;
    else added += part.text;
  });
  flush();
  return out;
}

/** "+12 −3" words between two versions. */
export function changeSize(before: string, after: string) {
  let added = 0;
  let removed = 0;
  for (const part of diff(before, after)) {
    const words = (part.text.match(/[\p{L}\p{N}_]+/gu) || []).length;
    if (part.type === "added") added += words;
    if (part.type === "removed") removed += words;
  }
  return { added, removed };
}

/**
 * Finds text selected in the rendered document inside its Markdown source:
 * Markdown marks and spacing are ignored, offsets point into the source.
 */
export function locate(source: string, selected: string) {
  const squash = (text: string, keepMap: boolean) => {
    let out = "";
    const map: number[] = [];
    let space = true;
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (/[*_`#>~|]/.test(char)) continue;
      if (/\s/.test(char)) {
        if (space) continue;
        space = true;
        out += " ";
      } else {
        space = false;
        out += char;
      }
      if (keepMap) map.push(index);
    }
    return { out, map };
  };
  const exact = source.indexOf(selected);
  if (exact >= 0 && selected.trim()) return { start: exact, end: exact + selected.length };
  const hay = squash(source, true);
  const needle = squash(selected, false).out.trim();
  if (needle.length < 2) return null;
  const at = hay.out.indexOf(needle);
  if (at < 0) return null;
  return { start: hay.map[at], end: hay.map[at + needle.length - 1] + 1 };
}

const STORE = "genyxo:canvas-docs";
export function loadStored<T>(): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
/** Keeps the canvas across reloads, dropping the oldest versions if storage is full. */
export function saveStored<T extends { versions?: Version[] }>(docs: T[]) {
  let list = docs;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(STORE, JSON.stringify(list));
      return;
    } catch {
      list = list.map((doc) => ({ ...doc, versions: (doc.versions || []).slice(-Math.max(2, 20 >> attempt)) }));
    }
  }
}
