"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type RouteAlternative = { model: string; label: string; cost: number };
export type Route = {
  model: string;
  label: string;
  category: string;
  categoryLabel: string;
  reason: string;
  signals: string[];
  cost: number;
  preference: "economy" | "balanced" | "quality";
  search: boolean;
  downgradedFrom?: RouteAlternative;
  shortfall?: number;
  alternatives: RouteAlternative[];
};

export type Verdict = "supported" | "disputed" | "false" | "unverified";
export type ClaimSource = { title: string; url: string; kind?: "web" | "document"; excerpt?: string };
export type CheckScope = "web" | "documents" | "both";
export type CheckedClaim = {
  id: string;
  quote: string;
  claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  correction?: string;
  sources: ClaimSource[];
};
export type FactCheckResult = {
  verifier: string;
  verifierLabel: string;
  answerModel: string;
  checkedAt: string;
  claims: CheckedClaim[];
  counts: Record<Verdict, number>;
  score: number;
  summary: string;
  scope?: CheckScope;
  documents?: string[];
};

export function modelIcon(value = "") {
  if (value === "auto") return "/images/auto-route.svg";
  if (value.includes("dall-e")) return "/images/dalle-text.png";
  if (/flux|leonardo/.test(value)) return "/images/model-image.svg";
  if (/mistral|glm|granite|flint|lfm|openrouter\/free/.test(value)) return "/images/model-open.svg";
  if (value.includes("qwen")) return "/images/qwen-icon.svg";
  if (value.includes("llama") || value.includes("/meta/")) return "/images/meta-icon.svg";
  if (value.includes("google/") || value.includes("gemma")) return "/images/google-gemini.svg";
  if (value.includes("openai") || value.includes("gpt")) return "/images/openai-mark.svg";
  if (value.includes("anthropic") || value.includes("claude")) return "/images/claude-ai.svg";
  if (value.includes("nvidia/")) return "/images/nvidia-icon.svg";
  if (value.includes("kling")) return "/images/kling-video.svg";
  return "/images/logo.svg";
}

export const credits = (cost: number) => (cost > 0 ? `${cost} cr` : "Free");

export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function Favicon({ url, size = 14 }: { url: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <span className="gx-ai-favicon-letter" style={{ width: size, height: size }}>
        {hostOf(url).charAt(0).toUpperCase()}
      </span>
    );
  return (
     
    <img
      className="gx-ai-favicon"
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url))}&sz=64`}
      width={size}
      height={size}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const VERDICT_ICON: Record<Verdict, ReactNode> = {
  supported: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...stroke}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  ),
  disputed: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...stroke}>
      <path d="M12 8v5M12 16.5v.01" />
      <path d="M10.3 3.9 2.6 17.3A2 2 0 0 0 4.3 20.3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  ),
  false: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...stroke}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  ),
  unverified: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" {...stroke}>
      <path d="M9.4 9.2a2.7 2.7 0 1 1 3.7 2.5c-.7.3-1.1.9-1.1 1.6v.5M12 17v.01" />
    </svg>
  ),
};
export const VERDICT_LABEL: Record<Verdict, string> = {
  supported: "Supported",
  disputed: "Disputed",
  false: "Likely wrong",
  unverified: "Unverified",
};

export function ShieldIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...stroke}>
      <path d="M12 3 4.5 6v5.6c0 4.6 3.1 8.2 7.5 9.4 4.4-1.2 7.5-4.8 7.5-9.4V6L12 3Z" />
      <path d="m8.8 12.2 2.3 2.3 4.2-4.4" />
    </svg>
  );
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Keeps a closing surface mounted long enough to play its exit. */
export function usePresence(open: boolean, ms = 180) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(timer);
  }, [open, ms]);
  return mounted;
}

/**
 * A liquid-glass card pinned to an element: opens below it (or above when
 * there is no room), follows it while the chat scrolls, and closes on an
 * outside press or Escape.
 */
export function Floating({
  anchor,
  open,
  onClose,
  width = 340,
  label,
  className = "",
  onPointerEnter,
  onPointerLeave,
  children,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  width?: number;
  label: string;
  className?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  children: ReactNode;
}) {
  const mounted = usePresence(open);
  const surface = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ style: CSSProperties; side: "top" | "bottom"; origin: number } | null>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!mounted || !anchor) return;
    let frame = 0;
    let previous = "";
    const measure = () => {
      const box = anchor.getBoundingClientRect();
      const height = surface.current?.offsetHeight || 260;
      const key = `${box.left}|${box.top}|${box.width}|${box.height}|${height}|${innerWidth}|${innerHeight}`;
      if (key !== previous) {
        previous = key;
        const size = Math.min(width, innerWidth - 24);
        const below = innerHeight - box.bottom - 12;
        const side = below >= Math.min(height, 320) || box.top < below ? "bottom" : "top";
        const left = Math.max(12, Math.min(box.left + box.width / 2 - size / 2, innerWidth - size - 12));
        const room = side === "bottom" ? below - 8 : box.top - 20;
        setPlace({
          side,
          origin: Math.max(16, Math.min(size - 16, box.left + box.width / 2 - left)),
          style:
            side === "bottom"
              ? { left, width: size, top: box.bottom + 8, maxHeight: Math.max(180, room) }
              : { left, width: size, bottom: innerHeight - box.top + 8, maxHeight: Math.max(180, room) },
        });
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [mounted, anchor, width]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (surface.current?.contains(target) || anchor?.contains(target)) return;
      close.current();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      close.current();
      anchor?.focus?.({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open, anchor]);

  if (!mounted || !anchor) return null;
  return createPortal(
    <div
      ref={surface}
      className={`gx-ai-float ${className}`}
      role="dialog"
      aria-label={label}
      data-side={place?.side || "bottom"}
      data-state={open ? "open" : "closing"}
      style={{ ...(place?.style || { left: -9999, top: -9999, width }), "--origin": `${place?.origin ?? width / 2}px` } as CSSProperties}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>,
    document.body,
  );
}
