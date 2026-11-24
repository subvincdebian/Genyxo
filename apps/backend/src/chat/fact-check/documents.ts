import type { IAttachedFile } from "../message.entity";
import { indexProjectText } from "../workspace/project-fragments";

/** A text document a fact-check can quote: an attachment or a project file. */
export interface CheckDocument {
  name: string;
  origin: "chat" | "project";
  chunks: { index: number; text: string; page?: number | null }[];
}

export interface DocumentPassage {
  name: string;
  fragment: number;
  page?: number | null;
  text: string;
}

/** Words and numbers worth matching; "30" days matters as much as "notice". */
export function terms(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2 || /^\d+$/.test(word));
}

/** Files with readable text, newest first, one entry per file name. */
export function documentsFrom(
  attachments: IAttachedFile[],
  projectFiles: IAttachedFile[] = [],
): CheckDocument[] {
  const seen = new Set<string>();
  const documents: CheckDocument[] = [];
  const add = (file: IAttachedFile, origin: CheckDocument["origin"]) => {
    const text = file.extracted_text?.trim();
    if (!text || seen.has(file.name)) return;
    seen.add(file.name);
    documents.push({
      name: file.name,
      origin,
      chunks: file.text_chunks?.length
        ? file.text_chunks
        : indexProjectText(text),
    });
  };
  attachments.forEach((file) => add(file, "chat"));
  projectFiles.forEach((file) => add(file, "project"));
  return documents.slice(0, 12);
}

/**
 * The document fragments that share the most words and numbers with a claim,
 * each cut down to its most relevant sentences.
 */
export function documentEvidence(
  documents: CheckDocument[],
  claim: string,
  limit = 3,
): DocumentPassage[] {
  const wanted = new Set(terms(claim));
  if (!wanted.size) return [];
  const scored = documents.flatMap((document) =>
    document.chunks.map((chunk) => {
      const words = new Set(terms(chunk.text));
      let score = 0;
      wanted.forEach((word) => {
        if (words.has(word)) score += /^\d+$/.test(word) ? 2 : 1;
      });
      return { document, chunk, score };
    }),
  );
  return scored
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ document, chunk }) => ({
      name: document.name,
      fragment: chunk.index,
      page: chunk.page ?? null,
      text: bestSentences(chunk.text, wanted, 900) || chunk.text.slice(0, 700),
    }));
}

/** The sentences of a text with the most wanted words, in text order. */
export function bestSentences(
  text: string,
  wanted: Set<string>,
  limit: number,
) {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 15 && sentence.length < 700);
  const ranked = sentences
    .map((sentence, index) => ({
      index,
      sentence,
      score: terms(sentence).filter((word) => wanted.has(word)).length,
    }))
    .filter((item) => item.score >= 2)
    .sort((a, b) => b.score - a.score);
  const picked: typeof ranked = [];
  let length = 0;
  for (const item of ranked) {
    if (length + item.sentence.length > limit) continue;
    picked.push(item);
    length += item.sentence.length;
  }
  return picked
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" … ");
}
