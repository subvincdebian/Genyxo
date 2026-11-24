"use client";
/**
 * Dictation for the pet's composer: records the microphone and lets the same
 * transcription endpoint as the main composer turn it into text.
 */
export type DictationState = "idle" | "listening" | "transcribing";

const LIMIT_MS = 120_000;

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export function createDictation(events: {
  onState: (state: DictationState) => void;
  onText: (text: string) => void;
  onError: (message: string) => void;
}) {
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let chunks: Blob[] = [];
  let state: DictationState = "idle";
  let disposed = false;
  const set = (next: DictationState) => {
    state = next;
    if (!disposed) events.onState(next);
  };
  const release = () => {
    clearTimeout(limit);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  async function transcribe(blob: Blob) {
    set("transcribing");
    try {
      const response = await fetch("/api/chat/voice/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
        },
        body: JSON.stringify({
          audio: await toBase64(blob),
          mimeType: blob.type || "audio/webm",
          locales: [...(navigator.languages || [])]
            .filter((tag) => /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag))
            .slice(0, 4),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { text?: string; message?: string };
      if (!response.ok) throw new Error(data.message || "Dictation failed.");
      if (data.text) events.onText(data.text);
      else events.onError("No speech was recognized. Try again a little closer to the microphone.");
    } catch (error) {
      events.onError(error instanceof Error ? error.message : "Dictation failed.");
    } finally {
      set("idle");
    }
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      events.onError("Dictation is not supported in this browser.");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      events.onError("Allow microphone access to dictate.");
      return;
    }
    if (disposed) return release();
    const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((candidate) =>
      MediaRecorder.isTypeSupported(candidate),
    );
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
      recorder = null;
      release();
      if (disposed) return;
      if (blob.size > 600) void transcribe(blob);
      else set("idle");
    };
    recorder.start(250);
    set("listening");
    limit = setTimeout(stop, LIMIT_MS);
  }
  function stop() {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  return {
    toggle() {
      if (state === "listening") stop();
      else if (state === "idle") void start();
    },
    stop,
    dispose() {
      disposed = true;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      release();
    },
  };
}
export type PetDictation = ReturnType<typeof createDictation>;
