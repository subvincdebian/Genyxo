"use client";
import { useEffect, useRef, useState } from "react";
import { Floating, credits, modelIcon, type Route } from "./shared";
import { RouteDetails } from "./RouteBadge";

type Draft = { text: string; files: { mime_type: string; name?: string }[]; mode?: string; preference: string };

function readDraft(): Draft | null {
  const select = document.getElementById("modelSelect") as HTMLSelectElement | null;
  if (select?.value !== "auto") return null;
  const input = document.getElementById("userInput") as (HTMLElement & { value?: string }) | null;
  const text = String(input?.value ?? input?.textContent ?? "").trim();
  const attached = ((window as unknown as { attachedFiles?: File[] }).attachedFiles || []).slice(0, 20);
  const collected: { mode?: string } = {};
  document.dispatchEvent(new CustomEvent("genyxo:composer-collect", { detail: collected }));
  let preference = "balanced";
  try {
    preference = localStorage.getItem("genyxo:auto-preference") || "balanced";
  } catch {
    /* Storage can be blocked. */
  }
  return {
    text: text.slice(0, 2000),
    files: attached.map((file) => ({ mime_type: file.type || "application/octet-stream", name: file.name?.slice(0, 255) })),
    mode: collected.mode,
    preference,
  };
}

/**
 * While Auto is selected, a glass pill above the composer shows which model
 * will answer and what it costs, updating as the user types.
 */
export function AutoRoutePreview() {
  const [route, setRoute] = useState<Route | null>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const signature = useRef("");
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    let timer = 0;
    const refresh = () => {
      const draft = readDraft();
      const empty = !draft || (!draft.text && !draft.files.length);
      if (empty) {
        signature.current = "";
        request.current?.abort();
        setVisible(false);
        setOpen(false);
        return;
      }
      const key = JSON.stringify(draft);
      if (key === signature.current) return;
      signature.current = key;
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        try {
          const token = localStorage.getItem("authToken");
          if (!token) return;
          const response = await fetch("/api/chat/route", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              message: draft!.text,
              files: draft!.files,
              ...(draft!.mode === "search" || draft!.mode === "research" ? { mode: draft!.mode } : {}),
              preference: draft!.preference,
            }),
          });
          if (!response.ok) return;
          setRoute(await response.json());
          setVisible(true);
        } catch {
          /* A newer keystroke replaced this request. */
        }
      }, 260);
    };
    const input = document.getElementById("userInput");
    const select = document.getElementById("modelSelect");
    input?.addEventListener("input", refresh);
    select?.addEventListener("change", refresh);
    document.addEventListener("genyxo:auto-preference", refresh);
    // Attachments and "+" modes change without an input event.
    const poll = window.setInterval(refresh, 900);
    const sent = () => {
      signature.current = "";
      setVisible(false);
      setOpen(false);
    };
    document.addEventListener("genyxo:composer-sent", sent);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      request.current?.abort();
      input?.removeEventListener("input", refresh);
      select?.removeEventListener("change", refresh);
      document.removeEventListener("genyxo:auto-preference", refresh);
      document.removeEventListener("genyxo:composer-sent", sent);
    };
  }, []);

  if (!route) return null;
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        className="gx-ai-preview"
        data-visible={visible || undefined}
        data-warn={route.shortfall ? "" : undefined}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Why this model?"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        <img className="gx-ai-preview-auto" src="/images/auto-route.svg" alt="" width={13} height={13} />
        <span className="gx-ai-preview-swap" key={route.model}>
          <img src={modelIcon(route.model)} alt="" width={14} height={14} />
          <strong>{route.label}</strong>
        </span>
        {(route.cost > 0 || route.shortfall) && (
          <span className="gx-ai-cost">{route.shortfall ? `Needs ${route.cost} cr` : credits(route.cost)}</span>
        )}
      </button>
      <Floating anchor={anchor} open={open && visible} onClose={() => setOpen(false)} label="Why this model" width={340}>
        <RouteDetails route={route} />
      </Floating>
    </>
  );
}
