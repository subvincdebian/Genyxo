// The assistant's speaking voice: one of Gemini's prebuilt voices, remembered
// per browser so every call starts with the voice the person picked.

export type VoiceOption = { name: string; tone: string; featured?: boolean };

export const VOICE_OPTIONS: VoiceOption[] = [
  { name: "Kore", tone: "Firm", featured: true },
  { name: "Aoede", tone: "Breezy", featured: true },
  { name: "Puck", tone: "Upbeat", featured: true },
  { name: "Charon", tone: "Informative", featured: true },
  { name: "Leda", tone: "Youthful", featured: true },
  { name: "Fenrir", tone: "Excitable", featured: true },
  { name: "Sulafat", tone: "Warm", featured: true },
  { name: "Achird", tone: "Friendly", featured: true },
  { name: "Zephyr", tone: "Bright" },
  { name: "Orus", tone: "Firm" },
  { name: "Callirrhoe", tone: "Easy-going" },
  { name: "Autonoe", tone: "Bright" },
  { name: "Enceladus", tone: "Breathy" },
  { name: "Iapetus", tone: "Clear" },
  { name: "Umbriel", tone: "Easy-going" },
  { name: "Algieba", tone: "Smooth" },
  { name: "Despina", tone: "Smooth" },
  { name: "Erinome", tone: "Clear" },
  { name: "Algenib", tone: "Gravelly" },
  { name: "Rasalgethi", tone: "Informative" },
  { name: "Laomedeia", tone: "Upbeat" },
  { name: "Achernar", tone: "Soft" },
  { name: "Alnilam", tone: "Firm" },
  { name: "Schedar", tone: "Even" },
  { name: "Gacrux", tone: "Mature" },
  { name: "Pulcherrima", tone: "Forward" },
  { name: "Zubenelgenubi", tone: "Casual" },
  { name: "Vindemiatrix", tone: "Gentle" },
  { name: "Sadachbia", tone: "Lively" },
  { name: "Sadaltager", tone: "Knowledgeable" },
];

const STORAGE_KEY = "genyxo.voice";
const DEFAULT_VOICE = "Kore";
const listeners = new Set<() => void>();
let current: string | null = null;

function read() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VOICE_OPTIONS.some((voice) => voice.name === saved)) return saved;
  } catch { /* storage blocked: use the default */ }
  return DEFAULT_VOICE;
}

export const getVoiceName = () => (current ??= read());
export const getServerVoiceName = () => DEFAULT_VOICE;
export const subscribeVoiceName = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };

export function setVoiceName(name: string) {
  if (!VOICE_OPTIONS.some((voice) => voice.name === name)) return;
  current = name;
  try { localStorage.setItem(STORAGE_KEY, name); } catch { /* kept for this page only */ }
  listeners.forEach((listener) => listener());
}
