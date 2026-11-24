"use client";
/**
 * Cinematic hand-off from the pet to its settings page: a soft circle in the
 * theme colours grows out of the pet, the page changes underneath it, and the
 * settings page is revealed from the same point when it loads.
 */
const ARRIVAL_KEY = "genyxo.petArrival";
const SETTINGS = "/profile#pets";

const reducedMotion = () =>
  document.documentElement.dataset.gxMotion === "on" ||
  (document.documentElement.dataset.gxMotion !== "off" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches);

function veil(x: number, y: number) {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  const css = getComputedStyle(document.documentElement);
  const bg = css.getPropertyValue("--gx-bg").trim() || "#0c0d0d";
  const accent = css.getPropertyValue("--gx-accent").trim() || "#39a994";
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    pointerEvents: "none",
    background: `radial-gradient(circle at ${x}px ${y}px, color-mix(in srgb, ${accent} 30%, ${bg}) 0%, ${bg} 55%)`,
    backdropFilter: "blur(14px) saturate(1.4)",
  } as CSSStyleDeclaration);
  document.body.append(layer);
  return layer;
}
const radius = (x: number, y: number) =>
  Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 40;

export function openPetSettings(origin: { x: number; y: number }) {
  // Already in settings: switch section in place (the page animates it).
  if (location.pathname === "/profile") {
    if (location.hash !== "#pets") location.hash = "pets";
    return;
  }
  if (reducedMotion()) {
    location.assign(SETTINGS);
    return;
  }
  const layer = veil(origin.x, origin.y);
  const grow = layer.animate(
    [
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, opacity: 0.6 },
      {
        clipPath: `circle(${radius(origin.x, origin.y)}px at ${origin.x}px ${origin.y}px)`,
        opacity: 1,
      },
    ],
    { duration: 560, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" },
  );
  try {
    sessionStorage.setItem(ARRIVAL_KEY, JSON.stringify(origin));
  } catch {
    /* the reveal is only a nicety */
  }
  void grow.finished.then(() => location.assign(SETTINGS));
}

/** Call once on page load: finishes the transition started on the last page. */
export function revealAfterPetNavigation() {
  let origin: { x: number; y: number } | null = null;
  try {
    origin = JSON.parse(sessionStorage.getItem(ARRIVAL_KEY) || "null");
    sessionStorage.removeItem(ARRIVAL_KEY);
  } catch {
    origin = null;
  }
  if (!origin || reducedMotion()) return;
  const layer = veil(origin.x, origin.y);
  const end = radius(origin.x, origin.y);
  const reveal = layer.animate(
    [
      { clipPath: `circle(${end}px at ${origin.x}px ${origin.y}px)`, opacity: 1 },
      { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)`, opacity: 0.4 },
    ],
    { duration: 620, delay: 80, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" },
  );
  void reveal.finished.then(() => layer.remove(), () => layer.remove());
}
