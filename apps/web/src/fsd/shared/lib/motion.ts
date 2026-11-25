// Motion helpers shared by menus, dialogs and the chat.

/** True when the person asked for less motion, in Genyxo's settings or the system. */
export function prefersReducedMotion() {
  if (typeof document === "undefined") return true;
  const setting = document.documentElement.dataset.gxMotion;
  return setting === "on" || (setting !== "off" && matchMedia("(prefers-reduced-motion: reduce)").matches);
}

export const EASE_OUT = "cubic-bezier(.16, 1, .3, 1)";
export const EASE_IN = "cubic-bezier(.4, 0, 1, 1)";

/**
 * Lets a surface leave gracefully after React has already removed it: a
 * static copy stays where it was, plays the exit and disappears. Nothing in
 * the copy can be focused or clicked.
 */
export function leaveGhost(element: HTMLElement | null, keyframes: Keyframe[], duration = 160) {
  if (!element?.isConnected || prefersReducedMotion()) return;
  const box = element.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const ghost = element.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("id");
  ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  Object.assign(ghost.style, { position: "fixed", left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px`, margin: "0", pointerEvents: "none", animation: "none" });
  document.body.append(ghost);
  const motion = ghost.animate(keyframes, { duration, easing: EASE_IN, fill: "forwards" });
  const remove = () => ghost.remove();
  motion.finished.then(remove, remove);
}

/** A menu shrinking back toward where it opened from. */
export const MENU_EXIT: Keyframe[] = [
  { opacity: 1, transform: "none", filter: "blur(0)" },
  { opacity: 0, transform: "translateY(-3px) scale(.96)", filter: "blur(2px)" },
];
