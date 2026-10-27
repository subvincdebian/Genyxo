"use client";
import { useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MapCardData } from "../model/maps";
import { MapAnswerCard } from "./MapAnswerCard";
import { NavigationOverlay } from "./NavigationOverlay";
import { VoiceMapPeek } from "./VoiceMapPeek";

/**
 * The chat controller turns each ```genyxo-map fence into an empty element and
 * announces it; this mounts the React map card into it. A card's element is
 * reused while the answer streams, so its map is created only once.
 */
export function MapCardsHost() {
  useEffect(() => {
    const roots = new Map<HTMLElement, Root>();
    const sweep = () => roots.forEach((root, element) => { if (!element.isConnected) { root.unmount(); roots.delete(element); } });
    const mount = (event: Event) => {
      const { element, data } = (event as CustomEvent<{ element: HTMLElement; data: MapCardData }>).detail;
      if (roots.has(element)) return;
      const root = createRoot(element);
      root.render(<MapAnswerCard data={data} />);
      roots.set(element, root);
      sweep();
    };
    document.addEventListener("genyxo:map-card", mount);
    const timer = window.setInterval(sweep, 15_000);
    return () => {
      document.removeEventListener("genyxo:map-card", mount);
      window.clearInterval(timer);
      roots.forEach((root) => root.unmount());
    };
  }, []);
  // Navigation and the voice-call map are global too: any card or page can start them.
  return <><NavigationOverlay /><VoiceMapPeek /></>;
}
