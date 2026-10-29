"use client";
import { flushSync } from "react-dom";
import { applyAppearance, readAppearance } from "./appearance";

let active: ViewTransition | undefined;
/** Reveal the actual new document snapshot from the control that changed its colors. */
export function transitionTheme(
  update: () => void,
  source?: HTMLElement | null,
) {
  const root = document.documentElement;
  const commit = () => {
    flushSync(update);
    applyAppearance(readAppearance());
  };
  const reduce =
    root.dataset.gxMotion === "on" ||
    (root.dataset.gxMotion !== "off" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (!document.startViewTransition || reduce) {
    active?.skipTransition();
    commit();
    return;
  }
  active?.skipTransition();
  const box = source?.getBoundingClientRect();
  const x = box ? box.left + box.width / 2 : innerWidth / 2;
  const y = box
    ? Math.max(0, Math.min(innerHeight, box.top + box.height / 2))
    : innerHeight / 3;
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  );
  root.dataset.gxThemeTransition = "true";
  const transition = document.startViewTransition(commit);
  active = transition;
  void transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 440,
          easing: "cubic-bezier(.2,.7,.2,1)",
          pseudoElement: "::view-transition-new(root)",
          fill: "both",
        },
      );
    })
    .catch(() => undefined);
  const clean = () => {
    if (active === transition) {
      active = undefined;
      delete root.dataset.gxThemeTransition;
    }
  };
  void transition.finished.then(clean, clean);
}
