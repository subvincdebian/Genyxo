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
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage", receiveInteractionStorage);
      window.removeEventListener("genyxo:auth-changed", sync);
      document.removeEventListener("genyxo:notifications-resync", reconnect);
    };
  }, [path]);
  return null;
}
