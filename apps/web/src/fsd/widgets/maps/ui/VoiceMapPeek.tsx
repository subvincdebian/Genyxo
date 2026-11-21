"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import type { MapCardData } from "../model/maps";
import { MapAnswerCard } from "./MapAnswerCard";

const voiceActive = () => document.documentElement.hasAttribute("data-voice-mode");

/**
 * Voice mode hides the chat, so a map the model looks up during a call slides
 * up on the voice stage itself: you hear the answer and see the places or the
 * route at the same time.
 */
export function VoiceMapPeek() {
  const [data, setData] = useState<MapCardData | null>(null);
  const [stage, setStage] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const onCard = (event: Event) => {
      if (!voiceActive()) return;
      setData((event as CustomEvent<{ data: MapCardData }>).detail.data);
      setStage(document.querySelector<HTMLElement>(".gx-voice-stage"));
    };
    const observer = new MutationObserver(() => {
      if (voiceActive()) setStage(document.querySelector<HTMLElement>(".gx-voice-stage"));
      else { setData(null); setStage(null); }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-voice-mode"] });
    document.addEventListener("genyxo:map-card", onCard);
    return () => { observer.disconnect(); document.removeEventListener("genyxo:map-card", onCard); };
  }, []);

  if (!data || !stage?.isConnected) return null;
  return createPortal(<div className="gx-voice-map" key={JSON.stringify(data).length}>
    <button type="button" className="gx-map-glass gx-voice-map-close" aria-label="Hide the map" onClick={() => setData(null)}><WorkspaceIcon name="close" size={14} /></button>
    <MapAnswerCard data={data} />
  </div>, stage);
}
