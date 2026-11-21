import type { IAttachedFile } from "../message.entity";

export function indexProjectText(text: string) {
  const chunks: { index: number; text: string }[] = [];
  for (let start = 0; start < text.length; start += 1640)
    chunks.push({
      index: chunks.length,
      text: text.slice(start, start + 1800),
    });
  return chunks;
}

/** Select bounded reference data; the result never contains executable actions. */
export function selectProjectFileContext(
  files: Pick<IAttachedFile, "name" | "extracted_text" | "text_chunks">[],
  query = "",
  budget = 12000,
) {
  const terms = [
    ...new Set(
      (query.toLocaleLowerCase().match(/[\p{L}\p{N}_-]{3,}/gu) || []).slice(
        0,
        40,
      ),
    ),
  ];
  const candidates = files
    .flatMap((file, fileIndex) => {
      const chunks =
        file.text_chunks || indexProjectText(file.extracted_text || "");
      return chunks.map((chunk) => {
        const text = `${file.name}\n${chunk.text}`.toLocaleLowerCase();
        const score = terms.reduce(
          (sum, term) => sum + (text.includes(term) ? 1 : 0),
          0,
        );
        return { ...chunk, fileIndex, name: file.name, score };
      });
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.index - b.index || a.fileIndex - b.fileIndex,
    );
  let remaining = Math.max(0, budget);
  const rows: string[] = [],
    sources: string[] = [];
  let truncated = false;
  for (const fragment of candidates) {
    if (remaining < 100) break;
    let text = fragment.text;
    let line = JSON.stringify({
      shared_file: fragment.name,
      fragment: fragment.index,
      text,
    });
    if (line.length + 1 > remaining) {
      truncated = true;
      const overhead =
        JSON.stringify({
          shared_file: fragment.name,
          fragment: fragment.index,
          text: "",
        }).length + 1;
      text = text.slice(0, Math.max(0, remaining - overhead - 20));
      line = JSON.stringify({
        shared_file: fragment.name,
        fragment: fragment.index,
        text,
      });
      while (text.length && line.length + 1 > remaining) {
        text = text.slice(0, Math.floor(text.length * 0.9));
        line = JSON.stringify({
          shared_file: fragment.name,
          fragment: fragment.index,
          text,
        });
      }
    }
    if (!text || line.length + 1 > remaining) continue;
    rows.push(line);
    remaining -= line.length + 1;
    if (!sources.includes(fragment.name)) sources.push(fragment.name);
  }
  return {
    text: rows.join("\n"),
    sources,
    limited: truncated || rows.length < candidates.length,
  };
}
