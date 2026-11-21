"use client";
import { useEffect } from "react";
import { drawOrb, labelFor, moodFor } from "../model/thinking-orb";

type Orb = { loader: HTMLElement; canvas: HTMLCanvasElement; label: HTMLElement; bubble: HTMLElement | null; steps: string[]; list: HTMLOListElement | null };

/**
 * Replaces the chat's three-dot loader with an orb pill: a dotted sphere whose
 * motion follows the current step (thinking, searching the map, planning a
 * route, making media) and a shimmering grey label naming that step.
 */
export function ThinkingOrbs() {
  useEffect(() => {
    const orbs = new Set<Orb>();
    const still = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const upgrade = (loader: HTMLElement) => {
      if (loader.dataset.orb) return;
      loader.dataset.orb = "1";
      loader.classList.add("gx-think-loader");
      loader.setAttribute("role", "status");
      const canvas = document.createElement("canvas");
      canvas.className = "gx-think-canvas";
      const ratio = Math.min(2, devicePixelRatio || 1);
      canvas.width = canvas.height = Math.round(30 * ratio);
      const label = document.createElement("span");
      label.className = "gx-think-label";
      loader.replaceChildren(canvas, label);
      const orb: Orb = { loader, canvas, label, bubble: loader.closest<HTMLElement>("[data-activity], .message"), steps: [], list: null };
      orbs.add(orb);
      tick(performance.now());
    };
    const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>(".chat-loader:not([data-orb])").forEach(upgrade);

    function tick(now: number) {
      cancelAnimationFrame(frame);
      const light = document.documentElement.getAttribute("data-theme") === "light";
      for (const orb of orbs) {
        if (!orb.loader.isConnected) { orb.list?.remove(); orbs.delete(orb); continue; }
        const step = orb.bubble?.dataset.activity;
        // Multi-step work (web search, Deep research) also lists the steps done so far.
        if (step && step !== "Generating response" && orb.steps.at(-1) !== step) {
          orb.steps.push(step);
          if (orb.steps.length >= 2) {
            if (!orb.list) {
              orb.list = document.createElement("ol");
              orb.list.className = "gx-think-steps";
              orb.list.setAttribute("aria-label", "Progress");
              orb.loader.after(orb.list);
            }
            const items = orb.steps.slice(-6);
            orb.list.replaceChildren(...items.map((item, index) => {
              const row = document.createElement("li");
              row.className = index === items.length - 1 ? "is-current" : "is-done";
              row.textContent = item;
              return row;
            }));
          }
        }
        const text = `${labelFor(step)}…`;
        if (orb.label.textContent !== text) orb.label.textContent = text;
        const mood = moodFor(step);
        orb.loader.dataset.mood = mood;
        const context = orb.canvas.getContext("2d");
        if (context) drawOrb(context, orb.canvas.width, still.matches ? 0 : now, mood, light);
      }
      if (orbs.size && !still.matches) frame = requestAnimationFrame(tick);
    }

    scan(document);
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(".chat-loader")) upgrade(node);
          else scan(node);
        });
        // A new activity step changes the label and motion right away.
        if (record.type === "attributes" && orbs.size) tick(performance.now());
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-activity"] });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); orbs.clear(); };
  }, []);
  return null;
}
