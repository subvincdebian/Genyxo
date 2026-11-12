"use client";
import { useLayoutEffect, type RefObject } from "react";

/** Native top-layer positioning escapes transformed ancestors and modal clipping. */
export function useTopLayer(
  ref: RefObject<HTMLElement | null>,
  present: boolean,
) {
  useLayoutEffect(() => {
    const node = ref.current;
    if (!present || !node || typeof node.showPopover !== "function") return;
    node.showPopover();
    return () => {
      if (node.isConnected && node.matches(":popover-open")) node.hidePopover();
    };
  }, [ref, present]);
}

/**
 * The visible area a floating menu may use: the viewport minus sticky or
 * fixed bars pinned to its top (site navbars), so menus never cover them.
 */
export function floatingBounds() {
  let top = 0;
  for (const element of document.querySelectorAll<HTMLElement>(
    "header, [data-sticky-top]",
  )) {
    const position = getComputedStyle(element).position;
    if (position !== "fixed" && position !== "sticky") continue;
    const box = element.getBoundingClientRect();
    if (box.top <= 1 && box.height > 0 && box.height < innerHeight / 3)
      top = Math.max(top, box.bottom);
  }
  return { top, bottom: innerHeight };
}

/** True when the reference is hidden under a bar or outside the viewport. */
export function referenceHidden(box: DOMRect) {
  const bounds = floatingBounds();
  return (
    box.bottom <= bounds.top + 2 ||
    box.top >= bounds.bottom ||
    box.right <= 0 ||
    box.left >= innerWidth ||
    !box.width ||
    !box.height
  );
}
