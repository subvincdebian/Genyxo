"use client";
import { PetCompanion, type PetVoice } from "@/widgets/pet";

// The pet shares the chat's voice call; loaded only when the pet needs it.
const loadVoice = (): Promise<PetVoice> =>
  import("@/widgets/chat/model/voice-session").then((voice) => ({
    getVoiceSnapshot: voice.getVoiceSnapshot,
    subscribeVoice: voice.subscribeVoice,
    startVoice: voice.startVoice,
    stopVoice: voice.stopVoice,
  }));

export function PetHost() {
  return <PetCompanion loadVoice={loadVoice} />;
}
