"use client";
import { getInteractions } from "./interaction-settings";
import type { NotificationCategory } from "./notification-settings";

export type PermissionState = NotificationPermission | "unsupported";

export function notificationPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window))
    return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationPermission() === "unsupported") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationPermission();
  }
}

/** The person is looking at another tab, window or app. */
export const isAway = () =>
  typeof document !== "undefined" &&
  (document.visibilityState === "hidden" || !document.hasFocus());

let audio: AudioContext | null = null;
/** Browsers only start audio after a gesture; call this from one, early. */
export function unlockNotificationSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    /* Audio is optional. */
  }
}

/** A short, soft two-note "tick": synthesized, so there is no file to ship. */
export function playNotificationSound() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const context = audio;
    const start = context.currentTime + 0.01;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 5200;
    const master = context.createGain();
    master.gain.value = 0.55;
    filter.connect(master).connect(context.destination);
    const note = (frequency: number, at: number, level: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.985, at + 0.2);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      oscillator.connect(gain).connect(filter);
      oscillator.start(at);
      oscillator.stop(at + 0.24);
    };
    note(1046.5, start, 0.22);
    note(1568, start + 0.075, 0.16);
  } catch {
    /* Audio is optional. */
  }
}

/** Only one open tab announces a given event. */
function claim(tag: string) {
  const key = "genyxo.notified";
  try {
    const now = Date.now();
    const seen = JSON.parse(localStorage.getItem(key) || "{}") as Record<
      string,
      number
    >;
    if (seen[tag] && now - seen[tag] < 15000) return false;
    const fresh = Object.fromEntries(
      Object.entries(seen).filter(([, time]) => now - time < 60000),
    );
    fresh[tag] = now;
    localStorage.setItem(key, JSON.stringify(fresh));
  } catch {
    /* Without storage every tab may announce; the shared tag still merges them. */
  }
  return true;
}

export type DesktopNotice = {
  category: NotificationCategory | "test";
  title: string;
  body: string;
  tag: string;
  /** Path to open when the notification is clicked. */
  url?: string;
};

/**
 * Show a system notification (visible over other sites and apps) when the
 * person allowed it for this category. Returns whether one was shown.
 */
export function deliverNotification(notice: DesktopNotice) {
  const preferences = getInteractions().settings.notifications;
  const wanted =
    notice.category === "test" ||
    preferences.categories[notice.category]?.push;
  if (!wanted || notificationPermission() !== "granted") return false;
  if (!claim(notice.tag)) return false;
  try {
    const notification = new Notification(notice.title, {
      body: notice.body,
      tag: notice.tag,
      icon: "/images/logo.svg",
      badge: "/images/logo.svg",
      silent: true,
    });
    notification.onclick = () => {
      window.focus();
      if (notice.url && notice.url !== location.pathname + location.hash)
        location.assign(notice.url);
      notification.close();
    };
  } catch {
    return false;
  }
  if (preferences.sound) playNotificationSound();
  return true;
}

/** Plain-text preview of a Markdown answer for a notification body. */
export function previewText(markdown: string, length = 140) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}
