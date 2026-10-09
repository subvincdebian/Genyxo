"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markNotificationsRead,
  parseNotification,
} from "./notifications-api";
import type { NotificationItem } from "./notifications-api";

export function useNotifications() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [actionError, setActionError] = useState(false);
  const [reading, setReading] = useState<readonly number[]>([]);
  const [readingAll, setReadingAll] = useState(false);
  const token = useRef<string | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const incoming = useRef(new Map<number, NotificationItem>());
  const readIds = useRef(new Set<number>());
  const pendingIds = useRef(new Set<number>());
  const pendingAll = useRef(false);

  const reload = useCallback(async () => {
    const auth = token.current;
    const mounted = lifetime.current;
    if (!auth || !mounted || mounted.signal.aborted) return;
    listRequest.current?.abort();
    const request = new AbortController();
    listRequest.current = request;
    setStatus("loading");
    try {
      const list = await getNotifications(
        auth,
        AbortSignal.any([request.signal, mounted.signal]),
      );
      if (
        request.signal.aborted ||
        mounted.signal.aborted ||
        listRequest.current !== request
      )
        return;
      for (const item of list) if (item.isRead) readIds.current.add(item.id);
      const fetchedById = new Map(list.map((item) => [item.id, item]));
      const received = [...incoming.current.values()].reverse().map((item) => {
        const persisted = fetchedById.get(item.id);
        return persisted ? { ...item, isRead: persisted.isRead } : item;
      });
      const receivedIds = new Set(received.map((item) => item.id));
      setItems(
        [...received, ...list.filter((item) => !receivedIds.has(item.id))].map(
          (item) =>
            readIds.current.has(item.id) ? { ...item, isRead: true } : item,
        ),
      );
      setStatus("ready");
    } catch {
      if (
        !request.signal.aborted &&
        !mounted.signal.aborted &&
        listRequest.current === request
      )
        setStatus("error");
    }
  }, []);

  useEffect(() => {
    const mounted = new AbortController();
    lifetime.current = mounted;
    try {
      token.current = localStorage.getItem("authToken");
    } catch {
      token.current = null;
    }
    if (!token.current) router.replace("/index.html");
    else
      queueMicrotask(() => {
        if (!mounted.signal.aborted) void reload();
      });

    function receive(event: Event) {
      if (!(event instanceof CustomEvent) || mounted.signal.aborted) return;
      const detail: unknown = event.detail;
      try {
        const item = parseNotification(detail, true);
        incoming.current.set(item.id, item);
        setItems((current) => [
          readIds.current.has(item.id) ? { ...item, isRead: true } : item,
          ...current.filter((entry) => entry.id !== item.id),
        ]);
        setStatus("ready");
      } catch {
        /* Ignore malformed realtime messages. */
      }
    }
    document.addEventListener("genyxo:notification", receive);
    return () => {
      mounted.abort();
      listRequest.current?.abort();
      document.removeEventListener("genyxo:notification", receive);
      if (lifetime.current === mounted) lifetime.current = null;
    };
  }, [reload, router]);

  async function markRead(item: NotificationItem) {
    const auth = token.current;
    const mounted = lifetime.current;
    if (
      item.isRead ||
      pendingIds.current.has(item.id) ||
      pendingAll.current ||
      !auth ||
      !mounted
    )
      return;
    pendingIds.current.add(item.id);
    setReading([...pendingIds.current]);
    setActionError(false);
    try {
      await markNotificationRead(auth, item.id, mounted.signal);
      if (mounted.signal.aborted) return;
      readIds.current.add(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, isRead: true } : entry,
        ),
      );
      document.dispatchEvent(new Event("genyxo:notifications-read"));
    } catch {
      if (!mounted.signal.aborted) setActionError(true);
    } finally {
      pendingIds.current.delete(item.id);
      if (!mounted.signal.aborted) setReading([...pendingIds.current]);
    }
  }

  async function markAllRead(confirmText: string, successText: string) {
    const auth = token.current;
    const mounted = lifetime.current;
    if (
      pendingAll.current ||
      pendingIds.current.size ||
      !auth ||
      !mounted ||
      !window.confirm(confirmText)
    )
      return;
    pendingAll.current = true;
    setReadingAll(true);
    setActionError(false);
    const affectedIds = items.map((item) => item.id);
    try {
      await markNotificationsRead(auth, mounted.signal);
      if (mounted.signal.aborted) return;
      for (const id of affectedIds) readIds.current.add(id);
      setItems((current) =>
        current.map((item) =>
          readIds.current.has(item.id) ? { ...item, isRead: true } : item,
        ),
      );
      document.dispatchEvent(new Event("genyxo:notifications-read"));
      document.dispatchEvent(
        new CustomEvent("genyxo:toast", {
          detail: { message: successText, type: "success" },
        }),
      );
      await reload();
    } catch {
      if (!mounted.signal.aborted) setActionError(true);
    } finally {
      pendingAll.current = false;
      if (!mounted.signal.aborted) setReadingAll(false);
    }
  }

  return {
    items,
    status,
    actionError,
    reading,
    readingAll,
    markRead,
    markAllRead,
  };
}
