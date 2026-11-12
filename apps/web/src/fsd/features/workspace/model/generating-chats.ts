"use client";
import { useEffect, useRef, useState } from "react";
import { workspaceRequest } from "./types";

declare global {
  interface Window {
    /** Read by the chat controller: chats whose reply is still generating on the server. */
    genyxoGenerating?: Set<number>;
  }
}

const POLL_MS = 2500;

/**
 * Replies keep generating on the server when the page is left, so the sidebar
 * asks which chats are still answering: right away, whenever this tab starts or
 * finishes a reply, every few seconds while any chat is busy, and when the next
 * scheduled task is due. A chat that finishes is announced so the open chat can
 * load its new answer.
 */
export function useGeneratingChats(enabled: boolean, onFinished: () => void) {
  const [ids, setIds] = useState<number[]>([]);
  const finished = useRef(onFinished);
  useEffect(() => { finished.current = onFinished; }, [onFinished]);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let known = new Set<number>();
    const check = async () => {
      clearTimeout(timer);
      let next: number[] = [];
      let nextTaskAt: string | null = null;
      try {
        const state = await workspaceRequest<{ conversationIds: number[]; nextTaskAt?: string | null }>("generating");
        next = state.conversationIds || [];
        nextTaskAt = state.nextTaskAt || null;
      } catch { next = [...known]; }
      if (!live) return;
      const now = new Set(next);
      const done = [...known].filter((id) => !now.has(id));
      known = now;
      window.genyxoGenerating = now;
      setIds((current) => (current.length === next.length && current.every((id) => now.has(id)) ? current : next));
      done.forEach((id) => document.dispatchEvent(new CustomEvent("genyxo:generation-finished", { detail: { id } })));
      if (done.length) finished.current();
      const streamingHere = document.getElementById("chatForm")?.classList.contains("is-generating");
      if (now.size || streamingHere) timer = setTimeout(check, POLL_MS);
      // A scheduled task starts its reply on the server: look when it is due.
      else if (nextTaskAt) {
        const due = new Date(nextTaskAt).getTime() - Date.now();
        if (due < 86_400_000) timer = setTimeout(check, Math.max(due, 0) + 2500);
      }
    };
    void check();
    // This tab starting or finishing a reply flips the composer's "is-generating" class.
    const form = document.getElementById("chatForm");
    const observer = new MutationObserver(() => void check());
    if (form) observer.observe(form, { attributes: true, attributeFilter: ["class"] });
    const visible = () => { if (document.visibilityState === "visible") void check(); };
    document.addEventListener("visibilitychange", visible);
    return () => { live = false; clearTimeout(timer); observer.disconnect(); document.removeEventListener("visibilitychange", visible); };
  }, [enabled]);

  return ids;
}
