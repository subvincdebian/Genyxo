"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";

const DISMISS_KEY = "genyxo:notify-asked";
const SOUND_KEY = "genyxo:reply-sound";

/** Two soft notes, like a message arriving; no audio file needed. */
function chime() {
  try {
    if (localStorage.getItem(SOUND_KEY) === "off") return;
    const audio = new AudioContext();
    const now = audio.currentTime;
    [[880, 0], [1318.5, 0.11]].forEach(([frequency, delay]) => {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = "sine";
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.45);
      tone.connect(gain).connect(audio.destination);
      tone.start(now + delay);
      tone.stop(now + delay + 0.5);
    });
    setTimeout(() => void audio.close(), 900);
  } catch { /* Sound is a nicety. */ }
}

let originalIcon: string | null = null;
/** The tab's icon gets a mint dot while answers wait unread. */
function badgeFavicon(on: boolean) {
  const link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (!link) return;
  originalIcon ??= link.href;
  if (!on) { link.href = originalIcon; return; }
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, 64, 64);
    context.beginPath();
    context.arc(50, 14, 13, 0, Math.PI * 2);
    context.fillStyle = "#5ee0c4";
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = "#0d0e0f";
    context.stroke();
    link.href = canvas.toDataURL("image/png");
  };
  image.src = originalIcon;
}

/**
 * Tells the user an answer is ready when they are not looking at it: a soft
 * chime, a system notification while the tab is in the background, a count in
 * the tab title, a dot on the tab icon and an unread dot on the chat in the
 * sidebar. The first time a reply runs, a glass pill offers notifications.
 */
export function ReplyNotifier() {
  const pathname = usePathname();
  const { conversations, selectedChatId, selectChat } = useWorkspace();
  const [, setWaiting] = useState(0);
  const [offer, setOffer] = useState<HTMLElement | null>(null);
  const live = useRef({ conversations, selectedChatId, pathname, selectChat });
  useEffect(() => { live.current = { conversations, selectedChatId, pathname, selectChat }; });
  const current = useRef<number | null>(null);
  const recent = useRef(new Map<number, number>());
  const stoppedAt = useRef(0);

  useEffect(() => {
    const title = () => document.title.replace(/^\(\d+\)\s+/, "");
    const announce = (id: number | null) => {
      if (id !== null) {
        const last = recent.current.get(id) || 0;
        if (Date.now() - last < 8000) return;
        recent.current.set(id, Date.now());
      }
      const { conversations: chats, selectedChatId: open, pathname: route } = live.current;
      const viewing = !document.hidden && (route === "/chat" || route === "/maps") && (id === null || id === open);
      if (viewing) return;
      chime();
      if (id !== null) document.dispatchEvent(new CustomEvent("genyxo:reply-unread", { detail: { id } }));
      if (document.hidden) {
        setWaiting((count) => { const next = count + 1; document.title = `(${next}) ${title()}`; return next; });
        badgeFavicon(true);
        if ("Notification" in window && Notification.permission === "granted") {
          const chat = chats.find((item) => item.id === id);
          const note = new Notification("Your answer is ready", { body: chat?.title || "Genyxo finished replying", icon: "/images/logo.svg", tag: `genyxo-reply-${id ?? "new"}` });
          note.onclick = () => { window.focus(); if (id !== null) live.current.selectChat(id); note.close(); };
        }
      }
    };

    // Replies that kept generating on the server after the page was left.
    const finished = (event: Event) => announce(Number((event as CustomEvent<{ id: number }>).detail?.id) || null);
    const state = (event: Event) => { current.current = (event as CustomEvent<{ conversationId: number | null }>).detail?.conversationId ?? null; };
    // Replies streaming in this tab: the composer's "is-generating" class turns off.
    const form = document.getElementById("chatForm");
    const busy = (classes: string | null | undefined) => /(^|\s)is-generating(\s|$)/.test(classes || "");
    // Every class change is checked against the one before it, so a reply that
    // starts and ends within one batch of mutations still counts.
    const observer = new MutationObserver((records) => {
      records.forEach((record, index) => {
        const before = busy(record.oldValue);
        const after = busy(records[index + 1]?.oldValue ?? form?.className);
        if (before && !after && Date.now() - stoppedAt.current > 2500 && !document.querySelector("#chatBox .message:last-child .gx-turn-error")) announce(current.current);
        if (!before && after && "Notification" in window && Notification.permission === "default") {
          let asked = false;
          try { asked = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* Storage is optional. */ }
          if (!asked) setOffer(document.querySelector<HTMLElement>(".input-form-wrapper"));
        }
      });
    });
    if (form) observer.observe(form, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
    const stop = (event: Event) => { if ((event.target as Element)?.closest?.("#stopBtn")) stoppedAt.current = Date.now(); };
    const visible = () => {
      if (document.hidden) return;
      setWaiting(0);
      document.title = title();
      badgeFavicon(false);
    };
    document.addEventListener("genyxo:generation-finished", finished);
    document.addEventListener("genyxo:chat-state", state);
    document.addEventListener("click", stop, true);
    document.addEventListener("visibilitychange", visible);
    return () => {
      observer.disconnect();
      document.removeEventListener("genyxo:generation-finished", finished);
      document.removeEventListener("genyxo:chat-state", state);
      document.removeEventListener("click", stop, true);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);

  const close = () => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* Storage is optional. */ } setOffer(null); };
  if (!offer?.isConnected) return null;
  return createPortal(<div className="gx-map-glass gx-notify-offer" role="status">
    <WorkspaceIcon name="bell" size={15} />
    <span>Get a notification when answers are ready</span>
    <button type="button" className="is-primary" onClick={() => { void Notification.requestPermission().finally(close); }}>Turn on</button>
    <button type="button" aria-label="Not now" onClick={close}><WorkspaceIcon name="close" size={13} /></button>
  </div>, offer);
}
