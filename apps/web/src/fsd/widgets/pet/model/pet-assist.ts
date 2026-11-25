"use client";
/**
 * The pet as an assistant over any page: it can read the page the user is on,
 * act on text they select, and bring scheduled reminders to their attention.
 */
import { SOCKET_URL } from "@/shared/config";

/* ---------- The page ---------- */

const SKIP = "script, style, noscript, svg, canvas, video, iframe, nav, footer, aside, [aria-hidden='true'], [hidden], [data-pet-layer], [data-pet-root], dialog:not([open])";
const MAX_PAGE_CHARS = 14000;

/** The readable text of the page: its main region, without navigation or the pet itself. */
export function pageContext() {
  const main =
    document.querySelector<HTMLElement>("#chatBox:not(:empty)") ||
    document.querySelector<HTMLElement>("main, [role='main']") ||
    document.body;
  const copy = main.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(SKIP).forEach((node) => node.remove());
  // innerText needs layout; the detached copy's textContent loses line breaks, so add them back.
  copy.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, tr, br, div, section, article, pre, blockquote").forEach((node) => node.append("\n"));
  const text = (copy.textContent || "")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return {
    title: document.title.replace(/\s*[|·—-]\s*Genyxo.*$/i, "").trim() || location.pathname,
    url: location.pathname,
    text: text.length > MAX_PAGE_CHARS ? `${text.slice(0, MAX_PAGE_CHARS)}\n…` : text,
  };
}

/** The page as a text file for the pet's request, so the question itself stays short. */
export function pageFile() {
  const page = pageContext();
  const body = `Page: ${page.title}\nAddress: ${page.url}\n\n${page.text}`;
  return { file: new File([body], "This page.txt", { type: "text/plain" }), name: page.title || "This page" };
}

/* ---------- Selected text ---------- */

export type PetSelection = { text: string; rect: DOMRect };

/** Text the user selected on the page, where the pet should offer help. */
export function readSelection(): PetSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const text = selection.toString().replace(/\s+\n/g, "\n").trim();
  if (text.length < 12 || !/\s/.test(text)) return null;
  const range = selection.getRangeAt(0);
  const host = range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  // Not in fields, editors, the pet or the canvas, which has its own selection tools.
  if (!host || host.closest("input, textarea, [contenteditable=''], [contenteditable='true'], [data-pet-layer], [data-pet-root], .gx-canvas")) return null;
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) return null;
  return { text: text.slice(0, 6000), rect };
}

export type SelectionAction = "summarize" | "explain" | "ask";

/** The request for a selection action; replies follow the language of the text. */
export function selectionPrompt(action: Exclude<SelectionAction, "ask">) {
  return action === "summarize"
    ? "Retell this passage briefly in plain words: the main point first, then the key details. Use the language of the passage."
    : "Explain this passage simply, as if to a smart friend: what it means, any terms, and why it matters. Use the language of the passage.";
}

/* ---------- Reminders ---------- */

export type PetReminder = {
  id: string;
  title: string;
  text: string;
  link?: string;
  failed?: boolean;
  /** When a snoozed reminder comes back. */
  dueAt: number;
};

const STORE = "genyxo.pet.reminders";
const read = (): PetReminder[] => {
  try {
    const value = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(value) ? value.slice(-8) : [];
  } catch {
    return [];
  }
};
const write = (list: PetReminder[]) => {
  try {
    localStorage.setItem(STORE, JSON.stringify(list.slice(-8)));
  } catch {
    /* Without storage a reminder lasts until the page reloads. */
  }
};

let reminders = read();
const listeners = new Set<() => void>();
const emit = () => {
  write(reminders);
  listeners.forEach((listener) => listener());
};
export const subscribeReminders = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
/** The reminder to show now: the oldest one that is due. */
export const dueReminder = () => reminders.find((item) => item.dueAt <= Date.now()) || null;
export const nextDueAt = () => Math.min(...reminders.map((item) => item.dueAt), Infinity);

export function dismissReminder(id: string) {
  reminders = reminders.filter((item) => item.id !== id);
  emit();
}
export function snoozeReminder(id: string, minutes = 10) {
  reminders = reminders.map((item) => (item.id === id ? { ...item, dueAt: Date.now() + minutes * 60_000 } : item));
  emit();
}
export function addReminder(reminder: Omit<PetReminder, "dueAt">) {
  if (reminders.some((item) => item.id === reminder.id)) return;
  reminders = [...reminders, { ...reminder, dueAt: Date.now() }];
  emit();
}

type LiveNotification = { id?: number; title?: string; message?: string; category?: string; link?: string; preview?: string };

/** "Scheduled task finished: Drink water" → "Drink water". */
const taskTitle = (title: string) => title.replace(/^Scheduled task (finished|couldn’t run|couldn't run):\s*/i, "").trim();

export function reminderFrom(notification: LiveNotification): Omit<PetReminder, "dueAt"> | null {
  if (notification.category !== "scheduled" || !notification.title) return null;
  const failed = /couldn.t run/i.test(notification.title);
  return {
    id: String(notification.id ?? `${notification.title}-${Date.now()}`),
    title: taskTitle(notification.title),
    text: failed ? notification.message || "" : notification.preview || notification.message || "",
    link: notification.link,
    failed,
  };
}

/**
 * The pet listens for reminders itself, so they reach it on every page, not
 * only on pages that keep the notifications connection open.
 */
export function listenForReminders() {
  let token = "";
  try {
    token = localStorage.getItem("authToken") || "";
  } catch {
    /* Signed out or storage blocked: no reminders. */
  }
  if (!token) return () => {};
  let closed = false;
  let release = () => {};
  void import("socket.io-client").then(({ io }) => {
    if (closed) return;
    const socket = io(`${SOCKET_URL}/notifications`, { transports: ["websocket"], addTrailingSlash: false, withCredentials: true, auth: { token } });
    socket.on("new_notification", (notification: LiveNotification) => {
      const reminder = reminderFrom(notification);
      if (reminder) addReminder(reminder);
    });
    release = () => socket.disconnect();
  });
  // Another tab dismissed or snoozed a reminder.
  const sync = (event: StorageEvent) => {
    if (event.key !== STORE) return;
    reminders = read();
    listeners.forEach((listener) => listener());
  };
  window.addEventListener("storage", sync);
  return () => {
    closed = true;
    release();
    window.removeEventListener("storage", sync);
  };
}
