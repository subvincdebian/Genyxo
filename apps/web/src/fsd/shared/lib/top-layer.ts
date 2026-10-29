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
