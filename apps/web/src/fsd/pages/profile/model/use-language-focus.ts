"use client";
import {
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { readAppearance } from "@/shared/lib/appearance";

/** The shared account menu can link straight to this control, even on this page. */
export function useLanguageFocus(
  expanded: boolean,
  setExpanded: Dispatch<SetStateAction<boolean>>,
  target: RefObject<HTMLElement | null>,
) {
  const [request, setRequest] = useState(0);
  useEffect(() => {
    const focusLanguage = () => {
      if (location.hash !== "#language") return;
      queueMicrotask(() => {
        setExpanded(true);
        setRequest((value) => value + 1);
      });
    };
    focusLanguage();
    window.addEventListener("hashchange", focusLanguage);
    document.addEventListener("genyxo:focus-language", focusLanguage);
    return () => {
      window.removeEventListener("hashchange", focusLanguage);
      document.removeEventListener("genyxo:focus-language", focusLanguage);
    };
  }, [setExpanded]);
  useEffect(() => {
    if (!expanded || !request) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const region = document.getElementById("additional-appearance");
      void Promise.all(
        (region?.getAnimations() || []).map((animation) =>
          animation.finished.catch(() => undefined),
        ),
      ).then(() => {
        if (cancelled || !target.current?.isConnected) return;
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
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [expanded, request, target]);
}
