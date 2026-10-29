import { cache } from "react";

export type SharedMessage = { id: number; role: "user" | "assistant"; content: string; attachments: string[]; model?: string };
export type SharedChat = { title: string; sharedAt: string; messages: SharedMessage[] };
export type SharedSource = { title: string; url: string };

/** One fetch per request for the page, its metadata and its preview image. */
export const loadSharedChat = cache(async (token: string): Promise<SharedChat | null> => {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  try {
    const backend = new URL(process.env.BACKEND_URL || "http://127.0.0.1:3000");
    backend.pathname = `${backend.pathname.replace(/\/$/, "")}/share/${token}`;
    const response = await fetch(backend, { next: { revalidate: 60 } });
    if (!response.ok) return null;
    return (await response.json()) as SharedChat;
  } catch {
    return null;
  }
});

const SOURCES = /```genyxo-sources\n([\s\S]*?)\n```/g;
/** Splits an answer into its text and the sources card it ended with. */
export function splitSources(content: string) {
  const sources: SharedSource[] = [];
  const text = content.replace(SOURCES, (_match, json: string) => {
    try { sources.push(...(JSON.parse(json).sources || [])); } catch { /* not a card */ }
    return "";
  });
  return { text: text.trim(), sources: sources.filter((source) => /^https?:\/\//.test(source.url)) };
}

/** Plain text for previews: no markdown marks, no images. */
export function plainText(markdown: string) {
  return splitSources(markdown).text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
