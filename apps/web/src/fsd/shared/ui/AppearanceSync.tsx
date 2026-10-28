"use client";
import { useEffect } from "react";
import {
  applyAppearance,
  clearAppearance,
  readAppearance,
} from "@/shared/lib/appearance";
import "./appearance.css";
export function AppearanceSync() {
  useEffect(() => {
    const sync = () => applyAppearance(readAppearance());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    document.addEventListener("genyxo:appearance", sync);
    window.addEventListener("storage", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("genyxo:appearance", sync);
      window.removeEventListener("storage", sync);
      clearAppearance();
    };
  }, []);
  return null;
}
