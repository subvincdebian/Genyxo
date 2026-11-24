/**
 * Genyxo pets: catalog, sprite atlas format and the per-browser preference.
 * The engine in widgets/pet only depends on this file and a mounted DOM node,
 * so the same code can later drive a desktop overlay window.
 *
 * Atlas format (built by scripts/pets/build_pet.py): one transparent WebP per
 * pet, 8 columns, one row per state, CELL-sized frames.
 */
export const PET_CELL = { width: 192, height: 216 } as const;
export const PET_STATES = [
  "idle",
  "run",
  "wave",
  "jump",
  "failed",
  "listen",
  "think",
  "happy",
  "sleep",
  "talk",
] as const;
export type PetState = (typeof PET_STATES)[number];

/** Frames per second and whether the row loops or plays once. */
export const PET_ANIMATION: Record<
  PetState,
  { fps: number; loop: boolean; frames: number; from?: number }
> = {
  idle: { fps: 5, loop: true, frames: 8 },
  run: { fps: 12, loop: true, frames: 8 },
  wave: { fps: 8, loop: false, frames: 8 },
  jump: { fps: 11, loop: false, frames: 8 },
  failed: { fps: 6, loop: false, frames: 8 },
  listen: { fps: 5, loop: true, frames: 8 },
  think: { fps: 4, loop: true, frames: 8 },
  happy: { fps: 9, loop: false, frames: 8 },
  // Frames 0-3 fall asleep once; 4-7 loop as slow breathing.
  sleep: { fps: 2.5, loop: true, frames: 8, from: 4 },
  talk: { fps: 9, loop: true, frames: 8 },
};

export type PetInfo = {
  id: string;
  name: string;
  description: string;
  accent: string;
};
export const PETS: readonly PetInfo[] = [
  {
    id: "nyx",
    name: "Nyx",
    description: "A bright crystal spirit that keeps your ideas sparkling.",
    accent: "#39a994",
  },
  {
    id: "tangle",
    name: "Tangle",
    description: "A yarn-ball kitten that untangles the hardest problems.",
    accent: "#8f7be8",
  },
  {
    id: "mothy",
    name: "Mothy",
    description: "A gentle night moth, drawn to every good question.",
    accent: "#f2b84b",
  },
  {
    id: "orbit",
    name: "Orbit",
    description: "A tiny planet that keeps your work in motion.",
    accent: "#4f8df7",
  },
  {
    id: "axo",
    name: "Axo",
    description: "A calm axolotl that loves to listen and talk.",
    accent: "#ef6f8f",
  },
];

export type PetSettings = {
  enabled: boolean;
  id: string;
  /** Position of the pet's centre as a fraction of the viewport. */
  x: number;
  y: number;
  /** Display height in CSS pixels. */
  size: number;
};
export const DEFAULT_PET: PetSettings = {
  enabled: false,
  id: "nyx",
  x: 0.92,
  y: 0.86,
  size: 132,
};

const KEY = "genyxo.pet";
const EVENT = "genyxo:pet";
let cached: PetSettings = DEFAULT_PET;
let loaded = false;

function parse(raw: string | null): PetSettings {
  try {
    const value = JSON.parse(raw || "null") as Partial<PetSettings> | null;
    if (!value || typeof value !== "object") return DEFAULT_PET;
    const clamp = (number: unknown, fallback: number, min: number, max: number) =>
      typeof number === "number" && Number.isFinite(number)
        ? Math.max(min, Math.min(max, number))
        : fallback;
    return {
      enabled: value.enabled === true,
      id: PETS.some((pet) => pet.id === value.id) ? value.id! : DEFAULT_PET.id,
      x: clamp(value.x, DEFAULT_PET.x, 0, 1),
      y: clamp(value.y, DEFAULT_PET.y, 0, 1),
      size: clamp(value.size, DEFAULT_PET.size, 96, 200),
    };
  } catch {
    return DEFAULT_PET;
  }
}

export function getPetSettings(): PetSettings {
  if (!loaded && typeof localStorage !== "undefined") {
    loaded = true;
    try {
      cached = parse(localStorage.getItem(KEY));
    } catch {
      cached = DEFAULT_PET;
    }
  }
  return cached;
}
export const getServerPetSettings = () => DEFAULT_PET;

export function updatePetSettings(patch: Partial<PetSettings>) {
  cached = parse(JSON.stringify({ ...getPetSettings(), ...patch }));
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    /* The pet still works for this page view. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribePetSettings(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cached = parse(event.newValue);
    listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

export const petAtlasUrl = (id: string) => `/pets/${id}.webp`;
