"use client";
import { useEffect, type RefObject } from "react";
import { readAppearance } from "@/shared/lib/appearance";

/** The shared account menu can link straight to the language control (/profile#language). */
export function useLanguageFocus(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const focusLanguage = () => {
      if (location.hash !== "#language") return;
      clearTimeout(timer);
      // Wait for the section to settle so the page heading focus does not win.
      timer = setTimeout(() => {
        if (!target.current?.isConnected) return;
        const motion = readAppearance().motion;
        const reduced =
          motion === "on" ||
          (motion === "system" &&
            matchMedia("(prefers-reduced-motion: reduce)").matches);
        const control =
          target.current.querySelector<HTMLElement>('[role="combobox"]') ||
          target.current;
        control.focus({ preventScroll: true });
        control.scrollIntoView({
          block: "center",
          behavior: reduced ? "instant" : "smooth",
        });
        target.current.dataset.highlight = "true";
        setTimeout(() => {
          if (target.current) delete target.current.dataset.highlight;
        }, 1600);
      }, 150);
    };
    focusLanguage();
    window.addEventListener("hashchange", focusLanguage);
    document.addEventListener("genyxo:focus-language", focusLanguage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", focusLanguage);
      document.removeEventListener("genyxo:focus-language", focusLanguage);
    };
  }, [target]);
}
