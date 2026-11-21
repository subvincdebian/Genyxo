"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  hydrateInteractions,
  receiveInteractionStorage,
  refreshRemoteInteractions,
} from "@/shared/lib/interaction-settings";
export function InteractionSync() {
  const path = usePathname();
  useEffect(() => {
    const sync = () => {
      void hydrateInteractions();
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("storage", receiveInteractionStorage);
    window.addEventListener("genyxo:auth-changed", sync);
    const reconnect = () => {
      void refreshRemoteInteractions();
    };
    document.addEventListener("genyxo:notifications-resync", reconnect);
    // Pages without the live socket (settings) pick up changes made on other
    // devices when the person returns to the tab.
    const returned = () => {
      if (document.visibilityState === "visible") reconnect();
    };
    window.addEventListener("focus", reconnect);
    document.addEventListener("visibilitychange", returned);
    return () => {
      window.removeEventListener("focus", reconnect);
      document.removeEventListener("visibilitychange", returned);
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage", receiveInteractionStorage);
      window.removeEventListener("genyxo:auth-changed", sync);
      document.removeEventListener("genyxo:notifications-resync", reconnect);
    };
  }, [path]);
  return null;
}
