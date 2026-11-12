export type AudioSettings = {
  input: string;
  output: string;
  microphone: number;
  speaker: number;
};
export const DEFAULT_AUDIO: AudioSettings = {
  input: "default",
  output: "default",
  microphone: 1,
  speaker: 1,
};
let fallback = DEFAULT_AUDIO;
export function getAudioSettings(): AudioSettings {
  if (typeof window === "undefined") return DEFAULT_AUDIO;
  try {
    const value =
      JSON.parse(localStorage.getItem("genyxo.audio") || "null") || fallback;
    return {
      input: typeof value.input === "string" ? value.input : "default",
      output: typeof value.output === "string" ? value.output : "default",
      microphone: Number.isFinite(value.microphone)
        ? Math.max(0, Math.min(1, value.microphone))
        : 1,
      speaker: Number.isFinite(value.speaker)
        ? Math.max(0, Math.min(1, value.speaker))
        : 1,
    };
  } catch {
    return fallback;
  }
}
export function setAudioSettings(patch: Partial<AudioSettings>) {
  const value = { ...getAudioSettings(), ...patch };
  fallback = value;
  try {
    localStorage.setItem("genyxo.audio", JSON.stringify(value));
  } catch {
    /* session-only preferences */
  }
  window.dispatchEvent(new Event("genyxo:audio-settings"));
}
export function subscribeAudioSettings(callback: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === "genyxo.audio") callback();
  };
  window.addEventListener("genyxo:audio-settings", callback);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener("genyxo:audio-settings", callback);
    window.removeEventListener("storage", storage);
  };
}
export const microphoneConstraints = (): MediaTrackConstraints => ({
  deviceId:
    getAudioSettings().input === "default"
      ? undefined
      : { ideal: getAudioSettings().input },
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
});
export async function routeAudioOutput(context: AudioContext) {
  const output = getAudioSettings().output;
  const sink = context as AudioContext & {
    setSinkId?: (id: string) => Promise<void>;
  };
  if (sink.setSinkId) await sink.setSinkId(output === "default" ? "" : output);
}
