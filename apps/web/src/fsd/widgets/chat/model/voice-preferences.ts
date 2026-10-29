import { getInteractions, subscribeInteractions, updateInteractions } from "@/shared/lib/interaction-settings";
export { VOICE_OPTIONS, type VoiceOption } from "@/shared/lib/voice-catalog";
export const getVoiceName = () => getInteractions().settings.voice;
export const getServerVoiceName = () => "Kore";
export const subscribeVoiceName = subscribeInteractions;
export function setVoiceName(name: string) { void updateInteractions({ voice: name }); }
