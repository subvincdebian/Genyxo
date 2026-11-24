"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { RouteBadge } from "./RouteBadge";
import { PlanCard, type PlanStep } from "./PlanCard";
import { FactCheckCard, type FactCheckDetail } from "./FactCheck";
import { AutoRoutePreview } from "./AutoRoutePreview";
import type { Route } from "./shared";
import { interceptMessageLinks } from "./message-links";
import { KnowledgeViewer, decorateKnowledgeLinks, type KnowledgeTarget } from "./KnowledgeViewer";
import "./intelligence.css";

/**
 * Mounts Auto mode's route badges and the fact-check cards the chat
 * controller announces, and the live route preview above the composer.
 */
export function IntelligenceHost() {
  const [previewSlot, setPreviewSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const roots = new Map<HTMLElement, Root>();
    const signals = new Map<HTMLElement, number>();
    const sweep = () =>
      roots.forEach((root, element) => {
        if (element.isConnected) return;
        root.unmount();
        roots.delete(element);
        signals.delete(element);
      });
    const rootFor = (element: HTMLElement) => {
      let root = roots.get(element);
      if (!root) {
        root = createRoot(element);
        roots.set(element, root);
      }
      return root;
    };
    const onRoute = (event: Event) => {
      const { element, route, answerWith } = (event as CustomEvent<{ element: HTMLElement; route: Route; answerWith: (model: string) => Promise<unknown> }>).detail;
      rootFor(element).render(<RouteBadge route={route} answerWith={answerWith} />);
    };
    const onFactCheck = (event: Event) => {
      const detail = (event as CustomEvent<FactCheckDetail>).detail;
      const signal = (signals.get(detail.element) || 0) + 1;
      signals.set(detail.element, signal);
      rootFor(detail.element).render(<FactCheckCard detail={detail} signal={signal} />);
    };
    const onPlan = (event: Event) => {
      const { element, plan, live } = (event as CustomEvent<{ element: HTMLElement; plan: PlanStep[]; live: boolean }>).detail;
      rootFor(element).render(<PlanCard plan={plan} live={live} />);
    };
    document.addEventListener("genyxo:agent-plan", onPlan);
    document.addEventListener("genyxo:route-badge", onRoute);
    document.addEventListener("genyxo:fact-check", onFactCheck);
    const timer = window.setInterval(sweep, 15_000);
    return () => {
      document.removeEventListener("genyxo:agent-plan", onPlan);
      document.removeEventListener("genyxo:route-badge", onRoute);
      document.removeEventListener("genyxo:fact-check", onFactCheck);
      window.clearInterval(timer);
      const all = [...roots.values()];
      roots.clear();
      queueMicrotask(() => all.forEach((root) => root.unmount()));
    };
  }, []);

  const [knowledge, setKnowledge] = useState<KnowledgeTarget | null>(null);
  // Links to messages in other chats (from chat search) open in place, and
  // knowledge citations show the cited passage.
  useEffect(
    () => interceptMessageLinks((anchor, sourceId, chunkId) => setKnowledge({ anchor, sourceId, chunkId })),
    [],
  );
  useEffect(() => {
    const box = () => document.getElementById("chatBox");
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = box();
        if (root) decorateKnowledgeLinks(root);
      });
    };
    const observer = new MutationObserver(run);
    observer.observe(document.body, { childList: true, subtree: true });
    run();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // The preview floats over the top edge of the composer.
  useEffect(() => {
    let slot: HTMLElement | null = null;
    const attach = () => {
      const wrapper = document.querySelector<HTMLElement>("#chatForm")?.parentElement;
      if (!wrapper || slot?.parentElement === wrapper) return;
      slot?.remove();
      slot = document.createElement("div");
      slot.className = "gx-ai-preview-slot";
      wrapper.prepend(slot);
      setPreviewSlot(slot);
    };
    attach();
    const timer = window.setInterval(attach, 1500);
    return () => {
      window.clearInterval(timer);
      slot?.remove();
    };
  }, []);

  return (
    <>
      {previewSlot ? createPortal(<AutoRoutePreview />, previewSlot) : null}
      <KnowledgeViewer target={knowledge} onClose={() => setKnowledge(null)} />
    </>
  );
}
