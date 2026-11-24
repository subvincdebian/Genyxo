"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./PetComposer.module.css";

/** Keeps a closing surface mounted long enough to play its exit. */
export function usePresence(open: boolean, ms = 160) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(timer);
  }, [open, ms]);
  return mounted;
}

/**
 * A liquid-glass surface anchored to the pet's composer. It opens on the side
 * with more room and caps its height to what is left, so it never runs off
 * screen, and follows the composer if the pet moves.
 */
export function PetPopover({
  anchor,
  trigger,
  open,
  align = "start",
  width = 320,
  cap = 340,
  label,
  accent,
  onClose,
  children,
}: {
  anchor: HTMLElement | null;
  trigger: HTMLElement | null;
  open: boolean;
  align?: "start" | "end";
  width?: number;
  cap?: number;
  label: string;
  accent: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ style: CSSProperties; side: "top" | "bottom" } | null>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!anchor) return;
    let frame = 0;
    let previous = "";
    const measure = () => {
      const box = anchor.getBoundingClientRect();
      const end = trigger?.getBoundingClientRect();
      const key = `${box.left}|${box.top}|${box.width}|${box.height}|${end?.right}|${innerWidth}|${innerHeight}`;
      if (key !== previous) {
        previous = key;
        const size = Math.min(width, innerWidth - 16);
        const below = innerHeight - box.bottom - 16;
        const above = box.top - 16;
        const side = above >= below ? "top" : "bottom";
        const room = side === "top" ? above : below;
        const right = align === "end" && end ? end.right + 6 : box.left + size;
        const left = Math.max(8, Math.min(align === "end" ? right - size : box.left, innerWidth - size - 8));
        const maxHeight = Math.max(150, Math.min(cap, room - 8));
        setPlace({
          side,
          style:
            side === "top"
              ? { left, width: size, bottom: innerHeight - box.top + 8, maxHeight }
              : { left, width: size, top: box.bottom + 8, maxHeight },
        });
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [anchor, trigger, align, width, cap]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (surface.current?.contains(target) || trigger?.contains(target)) return;
      close.current();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open, trigger]);

  if (!place) return null;
  return createPortal(
    <div
      ref={surface}
      className={styles.popover}
      data-pet-layer=""
      data-side={place.side}
      data-state={open ? "open" : "closing"}
      role="dialog"
      aria-label={label}
      style={{ ...place.style, "--pet-accent": accent } as CSSProperties}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          event.nativeEvent.stopImmediatePropagation();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
