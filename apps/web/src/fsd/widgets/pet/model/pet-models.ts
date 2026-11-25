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
  // Picks the model per message on the server, as in the main composer.
  chat("auto", "Auto", "Auto"),
  chat("google/gemini-3.5-flash", "Gemini 3.5 Flash", "Gemini"),
  chat("google/gemini-2.5-flash", "Gemini 2.5 Flash", "Gemini"),
  chat("google/gemini-3.1-flash-lite", "Gemini 3.1 Flash-Lite", "Gemini"),
  chat("groq/openai/gpt-oss-120b", "GPT-OSS 120B", "OpenAI"),
  chat("groq/openai/gpt-oss-20b", "GPT-OSS 20B", "OpenAI"),
  chat("groq/qwen/qwen3.8-27b", "Qwen 3.8", "Qwen"),
  chat("cf/qwen/qwen2.5-coder-32b-instruct", "Qwen 2.5 Coder", "Qwen"),
  chat("cf/meta/llama-3.3-70b-instruct-fp8-fast", "Llama 3.3 70B", "Llama"),
  chat("cf/meta/llama-4-scout-17b-16e-instruct", "Llama 4 Scout", "Llama"),
  chat("nim/mistralai/mistral-large-4-1t-a52b", "Mistral Large 4", "Mistral"),
  chat("cf/mistralai/mistral-small-3.1-24b-instruct", "Mistral Small 3.1", "Mistral"),
  chat("nim/minimaxai/minimax-m3.1-flash", "MiniMax M3.1 Flash", "MiniMax"),
  chat("nim/stepfun-ai/step-5-preview", "Step 5", "StepFun"),
  chat("cf/zai-org/glm-4.7-flash", "GLM 4.7 Flash", "GLM"),
  chat("nvidia/nemotron-3-ultra-550b-a55b:free", "Nemotron 3 Ultra", "NVIDIA Nemotron"),
  chat("nvidia/nemotron-3.5-super-vl:free", "Nemotron 3.5 Super", "NVIDIA Nemotron"),
  chat("nvidia/nemotron-3.5-lightning:free", "Nemotron 3.5 Lightning", "NVIDIA Nemotron"),
  chat("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "Nemotron 3 Nano Omni", "NVIDIA Nemotron"),
  chat("google/gemma-4-31b-it:free", "Gemma 4", "Gemma"),
  { value: "cf/black-forest-labs/flux-2-dev", label: "FLUX.2 Dev", provider: "FLUX", kind: "image", credits: 0 },
  { value: "cf/leonardo/lucid-origin", label: "Lucid Origin", provider: "Leonardo", kind: "image", credits: 0 },
];
export const PROVIDER_ORDER = ["Auto", "Gemini", "OpenAI", "Qwen", "Llama", "Mistral", "MiniMax", "StepFun", "GLM", "NVIDIA Nemotron", "Gemma", "FLUX", "Leonardo"];
export const DEFAULT_PET_MODEL = PET_MODELS[0].value;
export const IMAGE_MODEL = "cf/black-forest-labs/flux-2-dev";
export const VIDEO_MODEL = "kling-video";

export const findPetModel = (value: string) =>
  PET_MODELS.find((model) => model.value === value) || PET_MODELS[0];

export function modelIcon(value: string) {
  if (value === "auto") return "/images/auto-route.svg";
  if (value.includes("dall-e")) return "/images/dalle-text.png";
  if (/flux|leonardo/.test(value)) return "/images/model-image.svg";
  if (/mistral|glm|granite|flint|lfm|minimax|stepfun/.test(value)) return "/images/model-open.svg";
  if (value.includes("qwen")) return "/images/qwen-icon.svg";
  if (value.includes("llama") || value.includes("/meta/")) return "/images/meta-icon.svg";
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
