// Canvas requests: AI edits streamed into the document, and file exports.

const token = () => (typeof window !== "undefined" ? localStorage.getItem("authToken") || "" : "");

/** The chat's current model, so canvas edits use what the user picked. */
export function currentModel() {
  const value = (document.getElementById("modelSelect") as HTMLSelectElement | null)?.value || "";
  return value && value !== "auto" && !/dall-e|kling/.test(value) ? value : undefined;
}

export async function streamEdit(
  body: { content: string; language: string; instruction: string; selection?: { start: number; end: number } },
  onToken: (text: string) => void,
  signal: AbortSignal,
) {
  const response = await fetch("/api/chat/canvas/edit", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ ...body, model: currentModel() }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || "The edit could not start");
  }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamed = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: { token?: string; done?: boolean; text?: string; error?: string; creditBalance?: number };
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      if (event.error) throw new Error(event.error);
      if (event.token) {
        streamed += event.token;
        onToken(streamed);
      }
      if (event.done) return { text: event.text ?? streamed, creditBalance: event.creditBalance };
    }
  }
  throw new Error("The connection closed before the edit finished");
}

export async function exportDocument(format: "docx" | "pdf" | "pptx", doc: { title: string; content: string; language: string }) {
  const response = await fetch("/api/chat/canvas/export", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ format, title: doc.title, content: doc.content, language: doc.language }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "The document could not be exported");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const name = decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1] || "") || `${doc.title}.${format}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
