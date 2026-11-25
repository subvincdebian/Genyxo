"use client";
/**
 * The pet's own conversation: the same streaming endpoint, models, tools and
 * credits as the main chat, kept as a separate thread per browser tab.
 */
export type PetMessage = {
  id: number;
  role: "user" | "pet";
  text: string;
  files?: string[];
  error?: boolean;
  streaming?: boolean;
  /** What the pet is doing before the first words arrive. */
  activity?: string;
  model?: string;
  video?: string;
  /** Text from the page the question is about, shown above it. */
  quote?: string;
};
export type PetRequest = {
  model: string;
  mode?: "search" | "research";
  presetId?: number;
  projectId?: number;
};
export type PetAttachment = { file: File; name: string };

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const THREAD_KEY = "genyxo.pet.conversation";

const token = () => {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
};
export const petSignedIn = () => Boolean(token());

const toBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function acceptAttachment(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 8 MB.`;
  const fine =
    /^(image\/(png|jpeg|webp|gif)|application\/pdf|text\/)/.test(file.type) ||
    /\.(txt|md|csv|json|js|ts|tsx|py|html|css)$/i.test(file.name);
  return fine ? null : `${file.name} is not a supported file type.`;
}

export type PetStreamEvents = {
  onToken: (text: string) => void;
  onDone: (ok: boolean, error?: string) => void;
  /** A video model finished rendering. */
  onVideo?: (url: string) => void;
  /** Long jobs (video) report progress text. */
  onActivity?: (text: string) => void;
  /** Auto mode chose this model for the reply. */
  onRoute?: (model: string) => void;
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Video models answer with a message id; the clip is ready a minute or two later. */
async function waitForVideo(messageId: number, signal: AbortSignal) {
  for (let attempt = 0; attempt < 72; attempt++) {
    await sleep(5000, signal);
    const response = await fetch(`/api/chat/message-status/${messageId}`, {
      signal,
      headers: { Authorization: `Bearer ${token()}` },
    });
    if (!response.ok) continue;
    const data = (await response.json().catch(() => ({}))) as {
      isReady?: boolean;
      videoUrl?: string;
    };
    if (data.isReady && data.videoUrl) return data.videoUrl;
  }
  throw new Error("The video is taking too long. It will appear in your chats when ready.");
}

/** Send one turn; returns a function that stops the answer. */
export function sendToPet(
  message: string,
  attachments: PetAttachment[],
  request: PetRequest,
  events: PetStreamEvents,
) {
  const controller = new AbortController();
  (async () => {
    let finished = false;
    const finish = (ok: boolean, error?: string) => {
      if (finished) return;
      finished = true;
      events.onDone(ok, error);
    };
    try {
      const files = await Promise.all(
        attachments.map(async ({ file, name }) => ({
          mime_type: file.type || "text/plain",
          name,
          size: file.size,
          data: await toBase64(file),
        })),
      );
      const conversationId = Number(sessionStorage.getItem(THREAD_KEY)) || null;
      const locales = [...(navigator.languages || [])]
        .filter((tag) => /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag))
        .slice(0, 4);
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token()}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message,
          model: request.model,
          files,
          ...(request.mode ? { mode: request.mode } : {}),
          ...(request.presetId ? { presetId: request.presetId } : {}),
          ...(locales.length ? { locales } : {}),
          ...(conversationId
            ? { conversationId }
            : request.projectId
              ? { projectId: request.projectId }
              : {}),
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          response.status === 401
            ? "Sign in to chat with your pet."
            : data.message || `Request failed (${response.status})`,
        );
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let rest = "";
      let completed = false;
      let routed = request.model;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const lines = (rest + decoder.decode(value, { stream: true })).split("\n");
        rest = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw || raw === "[DONE]") continue;
          if (raw.startsWith("402"))
            throw new Error("Not enough credits. Top up your balance to continue.");
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(raw);
          } catch {
            continue;
          }
          if (data.conversationId)
            sessionStorage.setItem(THREAD_KEY, String(data.conversationId));
          if (typeof data.error === "string") throw new Error(data.error);
          const route = data.route as { model?: unknown } | undefined;
          if (data.status === "route" && typeof route?.model === "string") {
            routed = route.model;
            events.onRoute?.(routed);
          }
          if (typeof data.token === "string") events.onToken(data.token);
          if (data.status === "done") completed = true;
          if (typeof data.messageId === "number" && routed.includes("kling")) {
            await reader.cancel().catch(() => {});
            events.onActivity?.("Rendering your video");
            events.onVideo?.(await waitForVideo(data.messageId, controller.signal));
            finish(true);
            return;
          }
        }
      }
      finish(completed, completed ? undefined : "The answer was interrupted.");
    } catch (error) {
      if (controller.signal.aborted) finish(true);
      else finish(false, error instanceof Error ? error.message : String(error));
    }
  })();
  return () => controller.abort();
}

export function resetPetThread() {
  try {
    sessionStorage.removeItem(THREAD_KEY);
  } catch {
    /* nothing to reset */
  }
}
