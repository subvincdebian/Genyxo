"use client";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/shared/i18n";
import {
  deliverNotification,
  isAway,
  playNotificationSound,
  previewText,
  unlockNotificationSound,
} from "@/shared/lib/desktop-notify";
import { getInteractions } from "@/shared/lib/interaction-settings";
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "@/shared/lib/notification-settings";

type AnswerDone = {
  ok?: boolean;
  aborted?: boolean;
  text?: string;
  conversationId?: string | number | null;
  url?: string;
  model?: string;
  title?: string;
};
type ServerNotice = {
  id?: number;
  title?: string;
  message?: string;
  category?: string;
  link?: string;
};

const isCategory = (value: unknown): value is NotificationCategory =>
  NOTIFICATION_CATEGORIES.some((item) => item.id === value);

/**
 * Turns finished AI answers and real-time account events into system
 * notifications (shown over other sites and apps) with a soft sound.
 */
export function NotificationSync() {
  const { t } = useLanguage();
  const translate = useRef(t);
  useEffect(() => {
    translate.current = t;
  }, [t]);
  useEffect(() => {
    const unlock = () => unlockNotificationSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    const answer = (event: Event) => {
      const detail = (event as CustomEvent<AnswerDone>).detail || {};
      if (!detail.ok || detail.aborted || !isAway()) return;
      deliverNotification({
        category: "responses",
        title: detail.model
          ? `${detail.model} · ${translate.current("account.reply_ready", "Answer ready")}`
          : translate.current("account.reply_ready_title", "Your answer is ready"),
        body:
          previewText(detail.text || "") ||
          translate.current(
            "account.reply_open",
            "Open Genyxo to read the full response.",
          ),
        tag: `gx-answer-${detail.conversationId || "new"}-${Date.now()}`,
        url: detail.url || "/chat",
      });
    };
    const server = (event: Event) => {
      const notice = (event as CustomEvent<ServerNotice>).detail || {};
      if (!isCategory(notice.category)) return;
      const preferences = getInteractions().settings.notifications;
      if (!preferences.categories[notice.category].push) return;
      if (isAway()) {
        deliverNotification({
          category: notice.category,
          title: notice.title || "Genyxo",
          body: notice.message || "",
          tag: `gx-notice-${notice.id ?? Date.now()}`,
          url: notice.link || "/notifications",
        });
      } else if (preferences.sound) playNotificationSound();
    };
    document.addEventListener("genyxo:answer-done", answer);
    document.addEventListener("genyxo:media-ready", answer);
    document.addEventListener("genyxo:notification", server);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("genyxo:answer-done", answer);
      document.removeEventListener("genyxo:media-ready", answer);
      document.removeEventListener("genyxo:notification", server);
    };
  }, []);
  return null;
}
