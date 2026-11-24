"use client";
/**
 * Models the pet can answer with. The list mirrors the main composer's picker;
 * the pet keeps its own choice so switching here never changes the open chat.
 */
export type PetModelKind = "chat" | "image" | "video";
export type PetModel = {
  value: string;
  label: string;
  provider: string;
  kind: PetModelKind;
  credits?: number;
};

const chat = (value: string, label: string, provider: string, credits?: number): PetModel => ({
  value,
  label,
  provider,
  kind: "chat",
  credits,
});

export const PET_MODELS: PetModel[] = [
  chat("google/gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite", "Gemini"),
  chat("google/gemini-3.5-flash", "Gemini 3.5 Flash", "Gemini"),
  chat("google/gemini-3.1-flash-lite", "Gemini 3.1 Flash", "Gemini"),
  chat("google/gemini-2.5-pro", "Gemini 2.5 Pro", "Gemini"),
  chat("google/gemini-2.5-flash", "Gemini 2.5 Flash", "Gemini"),
  chat("openai/gpt-5.1", "ChatGPT-5.1", "ChatGPT", 150),
  chat("openai/gpt-5-mini", "GPT-5 Mini", "ChatGPT", 70),
  chat("openai/gpt-5-nano", "GPT-5 Nano", "ChatGPT", 45),
  chat("openai/gpt-4.1", "ChatGPT-4.1", "ChatGPT", 55),
  chat("openai/gpt-4.1-mini", "ChatGPT-4 Mini", "ChatGPT", 25),
  chat("openai/gpt-4o", "ChatGPT-4o", "ChatGPT", 40),
  chat("openai/gpt-4o-mini", "ChatGPT-4o Mini", "ChatGPT", 20),
  chat("openai/o1-preview", "ChatGPT-o1", "ChatGPT", 100),
  chat("openai/o3-reasoning", "ChatGPT-o3 Reasoning", "ChatGPT", 150),
  chat("anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6", "Claude"),
  chat("anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5", "Claude"),
  chat("anthropic/claude-opus-4.6", "Claude Opus 4.6", "Claude"),
  chat("anthropic/claude-opus-4.5", "Claude Opus 4.5", "Claude"),
  chat("anthropic/claude-haiku-4.5", "Claude Haiku 4.5", "Claude"),
  chat("anthropic/claude-3-haiku", "Claude 3 Haiku", "Claude"),
  chat("nvidia/nemotron-3-ultra-550b-a55b:free", "Nemotron 3 Ultra", "NVIDIA Nemotron"),
  chat("nvidia/nemotron-3.5-super-vl:free", "Nemotron 3.5 Super", "NVIDIA Nemotron"),
  chat("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "Nemotron 3 Nano Omni", "NVIDIA Nemotron"),
  chat("google/gemma-4-31b-it:free", "Gemma 4", "Gemma"),
  { value: "openai/dall-e-3", label: "DALL·E 3", provider: "DALL·E", kind: "image", credits: 120 },
  { value: "kling-video", label: "Kling Video", provider: "Kling", kind: "video", credits: 500 },
];
export const PROVIDER_ORDER = ["Gemini", "ChatGPT", "Claude", "NVIDIA Nemotron", "Gemma", "DALL·E", "Kling"];
export const DEFAULT_PET_MODEL = PET_MODELS[0].value;
export const IMAGE_MODEL = "openai/dall-e-3";
export const VIDEO_MODEL = "kling-video";

export const findPetModel = (value: string) =>
  PET_MODELS.find((model) => model.value === value) || PET_MODELS[0];

export function modelIcon(value: string) {
  if (value.includes("dall-e")) return "/images/dalle-text.png";
  if (value.includes("gemini") || value.includes("gemma")) return "/images/google-gemini.svg";
  if (value.includes("openai")) return "/images/openai-mark.svg";
  if (value.includes("anthropic")) return "/images/claude-ai.svg";
  if (value.includes("nvidia/")) return "/images/nvidia-icon.svg";
  if (value.includes("kling")) return "/images/kling-video.svg";
  return "/images/logo.svg";
}

const MODEL_KEY = "genyxo.pet.model";
const FAVORITES_KEY = "genyxo:model-favorites";
const listeners = new Set<() => void>();
let cached: string | null = null;

export function getPetModel() {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(MODEL_KEY);
    cached = stored && PET_MODELS.some((model) => model.value === stored) ? stored : DEFAULT_PET_MODEL;
  } catch {
    cached = DEFAULT_PET_MODEL;
  }
  return cached;
}
export const getServerPetModel = () => DEFAULT_PET_MODEL;
export function setPetModel(value: string) {
  cached = findPetModel(value).value;
  try {
    localStorage.setItem(MODEL_KEY, cached);
  } catch {
    /* kept for this page only */
  }
  listeners.forEach((listener) => listener());
}
export function subscribePetModel(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Favourites are shared with the main model picker. */
export function readFavorites(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    return Array.isArray(list) ? list.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
export function toggleFavorite(value: string) {
  const list = readFavorites();
  const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    /* favourites are a convenience */
  }
  return next;
}
