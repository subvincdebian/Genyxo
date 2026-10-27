"use client";
// Voice conversation with the selected model. The browser records speech and
// detects when a phrase ends; the server transcribes it with Gemini (any
// language, detected automatically) and speaks replies back in that language.
// The chat controller sends each turn and reports streamed tokens through
// genyxo:answer-token / genyxo:answer-done events.

import { getVoiceName } from "./voice-preferences";
import { startLiveSession, type LiveSession } from "./live-engine";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking";
export type VoiceSnapshot = { active: boolean; phase: VoicePhase; muted: boolean; level: number; transcript: string; error: string; language: string };

const idle: VoiceSnapshot = { active: false, phase: "idle", muted: false, level: 0, transcript: "", error: "", language: "" };
let snapshot = idle;
const listeners = new Set<() => void>();
const set = (patch: Partial<VoiceSnapshot>) => { snapshot = { ...snapshot, ...patch }; listeners.forEach((listener) => listener()); };

// Tuned for a laptop microphone after the input gain below.
const MIC_GAIN = 1.8;
const SPEECH_START = 0.045;
const SPEECH_KEEP = 0.025;
const END_SILENCE_MS = 700;
const MIN_SPEECH_MS = 350;
const MAX_PHRASE_MS = 30000;

let stream: MediaStream | null = null;
let audio: AudioContext | null = null;
let input: AnalyserNode | null = null;
let destination: MediaStreamAudioDestinationNode | null = null;
let output: AnalyserNode | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];
let frame = 0;
let speechStartedAt = 0;
let lastVoiceAt = 0;
let loudSince = 0;
let recordingSince = 0;
let speechBuffer = "";
let inCode = false;
let codeAnnounced = false;
let answerDone = true;
let playback: Promise<void> = Promise.resolve();
let playing = 0;
let currentSource: AudioBufferSourceNode | null = null;
let turn = 0;

export const subscribeVoice = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const getVoiceSnapshot = () => snapshot;
export const getServerVoiceSnapshot = () => idle;

function notify(message: string, type = "error") {
  document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));
}
const token = () => { try { return localStorage.getItem("authToken"); } catch { return null; } };

const browserLocales = () => [...(navigator.languages || [])].filter((tag) => /^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)).slice(0, 4);

// Said once when a reply puts code or a file in the chat instead of reading it out.
const FILE_NOTICE: Record<string, string> = {
  uk: "Я додав файл у чат.", ru: "Я добавил файл в чат.", en: "I've put the file in the chat.", de: "Ich habe die Datei in den Chat gelegt.",
  fr: "J'ai mis le fichier dans le chat.", es: "He puesto el archivo en el chat.", pt: "Coloquei o arquivo no chat.", it: "Ho messo il file nella chat.",
  pl: "Dodałem plik do czatu.", cs: "Přidal jsem soubor do chatu.", sk: "Pridal som súbor do chatu.", tr: "Dosyayı sohbete ekledim.",
};
const fileNotice = () => FILE_NOTICE[snapshot.language.split("-")[0]] || FILE_NOTICE.en;

// Free Gemini keys allow only a few speech requests a day; once the server says
// the quota is used up, replies use the browser's voice without waiting on it.
let serverSpeechPausedUntil = 0;

async function api<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/chat/voice/${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.message || `Voice request failed (${response.status})`), { status: response.status });
  return data as T;
}

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});

const rms = (analyser: AnalyserNode, data: Uint8Array<ArrayBuffer>) => {
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (const value of data) { const centered = (value - 128) / 128; sum += centered * centered; }
  return Math.sqrt(sum / data.length);
};

function startRecorder() {
  if (!audio || !stream || !destination || snapshot.muted) return;
  const type = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((candidate) => MediaRecorder.isTypeSupported(candidate));
  recorder = new MediaRecorder(destination.stream, type ? { mimeType: type } : undefined);
  chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  recorder.start(250);
  recordingSince = performance.now();
  speechStartedAt = 0;
  loudSince = 0;
}

function stopRecorder(): Promise<Blob | null> {
  const active = recorder;
  recorder = null;
  if (!active || active.state === "inactive") return Promise.resolve(null);
  return new Promise((resolve) => {
    active.onstop = () => resolve(new Blob(chunks, { type: active.mimeType || "audio/webm" }));
    active.stop();
  });
}

function listen() {
  if (!snapshot.active) return;
  set({ phase: "listening", transcript: "", error: "" });
  if (!snapshot.muted) startRecorder();
}

// One loop drives the orb level and voice-activity detection.
function loop() {
  const data = new Uint8Array(new ArrayBuffer(512));
  const tick = () => {
    if (!snapshot.active) return;
    const now = performance.now();
    let level = 0;
    if (snapshot.phase === "speaking" && output) level = Math.min(1, rms(output, data) * 5);
    else if (snapshot.phase === "listening" && input && !snapshot.muted) {
      const volume = rms(input, data);
      level = Math.min(1, volume * 6);
      if (recorder) {
        if (volume > SPEECH_START) {
          if (!loudSince) loudSince = now;
          if (!speechStartedAt && now - loudSince > 120) speechStartedAt = loudSince;
        } else loudSince = 0;
        if (volume > SPEECH_KEEP) lastVoiceAt = now;
        if (speechStartedAt && now - lastVoiceAt > END_SILENCE_MS && lastVoiceAt - speechStartedAt > MIN_SPEECH_MS) void finishPhrase();
        else if (speechStartedAt && now - speechStartedAt > MAX_PHRASE_MS) void finishPhrase();
        else if (!speechStartedAt && now - recordingSince > 15000) { void stopRecorder().then(() => { if (snapshot.phase === "listening") startRecorder(); }); }
      }
    }
    const next = snapshot.level + (level - snapshot.level) * 0.3;
    if (Math.abs(next - snapshot.level) > 0.004) set({ level: next });
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

async function finishPhrase() {
  if (snapshot.phase !== "listening") return;
  const current = ++turn;
  set({ phase: "thinking", transcript: "…" });
  const blob = await stopRecorder();
  if (!blob || blob.size < 1200 || current !== turn) { listen(); return; }
  try {
    const { text, language } = await api<{ text: string; language: string }>("transcribe", { audio: await blobToBase64(blob), mimeType: blob.type || "audio/webm", sessionLanguage: snapshot.language || undefined, locales: browserLocales() });
    if (current !== turn || !snapshot.active) return;
    if (!text) { listen(); return; }
    set({ transcript: text, language: language || snapshot.language });
    send(text);
  } catch (error) {
    set({ error: error instanceof Error ? error.message : "Could not understand that." });
    window.setTimeout(listen, 1200);
  }
}

function send(text: string) {
  const field = document.getElementById("userInput") as HTMLTextAreaElement | null;
  const form = document.getElementById("chatForm") as HTMLFormElement | null;
  const sendButton = document.getElementById("sendBtn") as HTMLButtonElement | null;
  if (!field || !form || sendButton?.disabled) { listen(); return; }
  speechBuffer = ""; inCode = false; codeAnnounced = false; answerDone = false;
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  form.dataset.voiceTurn = "1";
  form.dataset.voiceLanguage = snapshot.language;
  form.requestSubmit();
}

// The best installed voice for a language: network "natural" voices sound far better than the defaults.
function browserVoice(language: string) {
  const base = language.split("-")[0].toLowerCase();
  const voices = speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().split(/[-_]/)[0] === base);
  const score = (voice: SpeechSynthesisVoice) => (/natural|neural|online/i.test(voice.name) ? 2 : 0) + (/google/i.test(voice.name) ? 1 : 0);
  return voices.sort((a, b) => score(b) - score(a))[0] || null;
}

function fallbackSpeak(text: string) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = snapshot.language || document.documentElement.lang || "en";
    utterance.voice = browserVoice(utterance.lang);
    utterance.onend = utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

async function synthesize(text: string, language: string, voice: string) {
  if (Date.now() < serverSpeechPausedUntil) return null;
  try {
    const { audio: data } = await api<{ audio: string; mimeType: string }>("speak", { text, language: language || undefined, voice });
    const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
    return audio ? await audio.decodeAudioData(bytes.buffer) : null;
  } catch (error) {
    if ((error as { status?: number }).status === 429) serverSpeechPausedUntil = Date.now() + 10 * 60_000;
    return null;
  }
}

/** Plays a short sample of a voice, for the voice picker. */
export async function previewVoice(voice: string) {
  const language = snapshot.language || navigator.language || "en";
  const sample = SAMPLE[language.split("-")[0]] || SAMPLE.en;
  const context = audio || new AudioContext();
  try {
    const { audio: data } = await api<{ audio: string; mimeType: string }>("speak", { text: sample, language, voice });
    const buffer = await context.decodeAudioData(Uint8Array.from(atob(data), (char) => char.charCodeAt(0)).buffer);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    return true;
  } catch (error) {
    if ((error as { status?: number }).status === 429) serverSpeechPausedUntil = Date.now() + 10 * 60_000;
    return false;
  }
}

const SAMPLE: Record<string, string> = {
  uk: "Привіт! Ось як я звучу.", ru: "Привет! Вот как я звучу.", en: "Hi! This is how I sound.", de: "Hallo! So klinge ich.",
  fr: "Salut ! Voici ma voix.", es: "¡Hola! Así sueno.", pt: "Olá! É assim que eu soo.", it: "Ciao! Ecco come suono.", pl: "Cześć! Tak brzmię.",
};

// Each chunk is synthesized as soon as it arrives and played in order.
function speak(text: string) {
  const clean = text.replace(/[*_#>`|~]+/g, " ").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/\s+/g, " ").trim();
  if (!clean || !snapshot.active) return;
  const current = turn;
  const audioPromise = synthesize(clean.slice(0, 1200), snapshot.language, getVoiceName());
  playing += 1;
  playback = playback.then(async () => {
    if (current !== turn || !snapshot.active) return;
    const buffer = await audioPromise;
    if (current !== turn || !snapshot.active) return;
    set({ phase: "speaking" });
    if (!buffer || !audio || !output) { await fallbackSpeak(clean); return; }
    await new Promise<void>((resolve) => {
      const source = audio!.createBufferSource();
      source.buffer = buffer;
      source.connect(output!);
      source.onended = () => resolve();
      currentSource = source;
      source.start();
    });
    currentSource = null;
  }).finally(() => {
    playing = Math.max(0, playing - 1);
    if (!playing && answerDone && snapshot.active && current === turn) listen();
  });
}

// Speak complete sentences as they stream; the first goes out alone for a fast start,
// later ones are grouped. Code blocks are announced once, not read aloud.
let spokenChunks = 0;
function flushSentences(final = false) {
  for (;;) {
    if (inCode) {
      const end = speechBuffer.indexOf("```");
      if (end < 0) { speechBuffer = ""; return; }
      speechBuffer = speechBuffer.slice(end + 3).replace(/^[^\n]*\n?/, "");
      inCode = false;
      continue;
    }
    const fence = speechBuffer.indexOf("```");
    if (fence >= 0) {
      if (speechBuffer.slice(0, fence).trim()) speak(speechBuffer.slice(0, fence));
      // A map card is shown on screen, not announced as a file.
      const isMap = speechBuffer.startsWith("genyxo-map", fence + 3);
      if (!codeAnnounced && !isMap) { speak(fileNotice()); codeAnnounced = true; }
      speechBuffer = speechBuffer.slice(fence + 3);
      inCode = true;
      continue;
    }
    const ends = [...speechBuffer.matchAll(/[.!?…。！？](\s|$)|\n\n/g)].map((match) => (match.index || 0) + match[0].length);
    const cut = spokenChunks === 0 ? ends[0] : ends.find((index) => index >= 360);
    if (cut === undefined) break;
    speak(speechBuffer.slice(0, cut));
    spokenChunks += 1;
    speechBuffer = speechBuffer.slice(cut);
  }
  if (final && !inCode && speechBuffer.trim()) { speak(speechBuffer); speechBuffer = ""; }
}

const onToken = (event: Event) => {
  if (!snapshot.active || answerDone) return;
  speechBuffer += String((event as CustomEvent).detail?.token || "");
  flushSentences();
};
const onDone = (event: Event) => {
  if (!snapshot.active || answerDone) return;
  answerDone = true;
  flushSentences(true);
  spokenChunks = 0;
  if (!(event as CustomEvent).detail?.ok && !playing) set({ error: "The model did not answer. Try again." });
  if (!playing) listen();
};

// Gemini Live is the main path: about a second to the first word. If it cannot
// start (no key, quota, blocked WebSocket) the call falls back to the
// record → transcribe → chat → speech pipeline below.
let live: LiveSession | null = null;

const currentConversationId = () => {
  const id = Number(new URL(window.location.href).searchParams.get("id"));
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

// Enough to name the reply language in the voice picker; Gemini itself follows the speaker.
function guessLanguage(text: string) {
  if (/[іїєґ]/i.test(text)) return "uk";
  if (/[ыэъё]/i.test(text)) return "ru";
  if (/[Ѐ-ӿ]/.test(text)) return snapshot.language || "";
  if (/^[\x20-\x7e\s]+$/.test(text) && /\b(the|is|are|you|what|how|hello)\b/i.test(text)) return "en";
  return snapshot.language;
}

const liveEvent = (detail: Record<string, unknown>) => document.dispatchEvent(new CustomEvent("genyxo:voice-live", { detail }));

async function startLive() {
  if (!stream || typeof AudioWorkletNode === "undefined" || typeof WebSocket === "undefined") return false;
  try {
    // On the Maps page the call knows where the user is and can search the map.
    const location = window.genyxoMaps?.location?.() || undefined;
    const session = await api<{ token: string; model: string; url: string }>("live", { voice: getVoiceName(), conversationId: currentConversationId(), locales: browserLocales(), location });
    if (!snapshot.active || !stream) return true;
    let userText = "";
    const started = await startLiveSession(stream, session, {
      onPhase: (phase) => set({ phase, ...(phase === "listening" ? { error: "" } : {}) }),
      onLevel: (level) => { const next = snapshot.level + (level - snapshot.level) * 0.3; if (Math.abs(next - snapshot.level) > 0.004) set({ level: next }); },
      onUserText: (text) => { userText = text; set({ transcript: text, language: guessLanguage(text) }); },
      onReply: (markdown) => liveEvent({ type: "reply", user: userText, markdown }),
      onTurn: ({ user, reply }) => { liveEvent({ type: "turn", user, markdown: reply }); userText = ""; },
      onError: (message) => { notify(message, "info"); stopVoice(); },
      onMapsTool: location
        ? (name, args) => api<{ output: unknown; markdown?: string }>("maps-tool", { name, args, location: window.genyxoMaps?.location?.() || location, language: snapshot.language.split("-")[0] || undefined })
        : undefined,
    });
    if (!snapshot.active) { started.stop(); return true; }
    live = started;
    return true;
  } catch (error) {
    console.warn("Live voice unavailable, using the fallback pipeline:", error);
    return false;
  }
}

export async function startVoice() {
  if (snapshot.active) return;
  if (!token()) { notify("Sign in to talk with the model.", "info"); return; }
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { notify("Voice conversation is not supported in this browser."); return; }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    notify("Allow microphone access to talk with the model.");
    return;
  }
  set({ ...idle, active: true, language: "" });
  if (await startLive()) return;
  if (!snapshot.active) return;
  audio = new AudioContext();
  // Created after the permission prompt, the context can start suspended and would hear silence.
  if (audio.state === "suspended") await audio.resume().catch(() => {});
  const source = audio.createMediaStreamSource(stream);
  const gain = audio.createGain();
  gain.gain.value = MIC_GAIN;
  input = audio.createAnalyser();
  input.fftSize = 512;
  destination = audio.createMediaStreamDestination();
  source.connect(gain);
  gain.connect(input);
  gain.connect(destination);
  output = audio.createAnalyser();
  output.fftSize = 512;
  output.connect(audio.destination);
  document.addEventListener("genyxo:answer-token", onToken);
  document.addEventListener("genyxo:answer-done", onDone);
  loop();
  listen();
}

export function stopVoice() {
  live?.stop();
  live = null;
  turn += 1;
  cancelAnimationFrame(frame);
  void stopRecorder();
  try { currentSource?.stop(); } catch { /* Already stopped. */ }
  currentSource = null;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  playing = 0;
  playback = Promise.resolve();
  answerDone = true;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  void audio?.close();
  audio = null;
  input = null;
  output = null;
  destination = null;
  document.removeEventListener("genyxo:answer-token", onToken);
  document.removeEventListener("genyxo:answer-done", onDone);
  set({ ...idle, language: snapshot.language });
}

export function toggleVoiceMute() {
  if (!snapshot.active) return;
  const muted = !snapshot.muted;
  stream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
  set({ muted });
  live?.setMuted(muted);
  if (live) return;
  if (muted) void stopRecorder();
  else if (snapshot.phase === "listening") startRecorder();
}

/** Tap the orb: stop the model talking (and generating) and listen again. */
export function interruptVoice() {
  if (!snapshot.active || (snapshot.phase !== "speaking" && snapshot.phase !== "thinking")) return;
  if (live) { live.interrupt(); return; }
  turn += 1;
  try { currentSource?.stop(); } catch { /* Already stopped. */ }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  playing = 0;
  playback = Promise.resolve();
  answerDone = true;
  (document.getElementById("stopBtn") as HTMLButtonElement | null)?.click();
  listen();
}
