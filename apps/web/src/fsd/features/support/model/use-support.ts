"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTickets, postTicket } from "./support-api";
import type { SupportTicket, TicketPriority } from "./support-api";

export function useSupport() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<"validation" | "request" | null>(
    null,
  );
  const token = useRef<string | null>(null);
  const lifetime = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const pendingSubmit = useRef(false);

  const reload = useCallback(async () => {
    const auth = token.current;
    const mounted = lifetime.current;
    if (!auth || !mounted || mounted.signal.aborted) return;
    listRequest.current?.abort();
    const request = new AbortController();
    listRequest.current = request;
    setStatus("loading");
    try {
      const list = await getTickets(
        auth,
        AbortSignal.any([request.signal, mounted.signal]),
      );
      if (
        mounted.signal.aborted ||
        request.signal.aborted ||
        listRequest.current !== request
      )
        return;
      setTickets(list);
      setStatus("ready");
    } catch {
      if (
        !mounted.signal.aborted &&
        !request.signal.aborted &&
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
    function notification(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (
        detail !== null &&
        typeof detail === "object" &&
        "type" in detail &&
        detail.type === "SUPPORT"
      )
        void reload();
    }
    document.addEventListener("genyxo:notification", notification);
    return () => {
      mounted.abort();
      listRequest.current?.abort();
      document.removeEventListener("genyxo:notification", notification);
      if (lifetime.current === mounted) lifetime.current = null;
    };
  }, [reload, router]);

  async function createTicket(
    subject: string,
    message: string,
    priority: TicketPriority,
    successText: string,
  ): Promise<boolean> {
    const auth = token.current;
    const mounted = lifetime.current;
    if (pendingSubmit.current || !auth || !mounted || mounted.signal.aborted)
      return false;
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (
      cleanSubject.length < 5 ||
      cleanSubject.length > 100 ||
      cleanMessage.length < 10 ||
      cleanMessage.length > 2000
    ) {
      setFormError("validation");
      return false;
    }
    pendingSubmit.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      await postTicket(
        auth,
        mounted.signal,
        cleanSubject,
        cleanMessage,
        priority,
      );
      if (mounted.signal.aborted) return false;
      document.dispatchEvent(
        new CustomEvent("genyxo:toast", {
          detail: { message: successText, type: "success" },
        }),
      );
      await reload();
      return !mounted.signal.aborted;
    } catch {
      if (!mounted.signal.aborted) setFormError("request");
      return false;
    } finally {
      pendingSubmit.current = false;
      if (!mounted.signal.aborted) setSubmitting(false);
    }
  }

  return { tickets, status, submitting, formError, createTicket };
}
