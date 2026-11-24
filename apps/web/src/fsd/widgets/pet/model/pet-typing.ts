"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Reveals streamed text at a steady, readable pace instead of in network
 * bursts. It speeds up when the backlog grows and finishes quickly once the
 * answer is complete, so the reader never waits on the animation.
 */
export function useTypewriter(target: string, streaming: boolean, reduced: boolean) {
  const [shown, setShown] = useState(() => (streaming ? "" : target));
  const position = useRef(shown.length);
  const live = useRef({ target, streaming });

  useEffect(() => {
    live.current = { target, streaming };
  }, [target, streaming]);

  useEffect(() => {
    if (reduced) {
      position.current = target.length;
      return;
    }
    let frame = 0;
    let last = performance.now();
    const step = (time: number) => {
      const { target: text, streaming: open } = live.current;
      const delta = Math.min(64, time - last);
      last = time;
      if (position.current > text.length) position.current = text.length;
      const backlog = text.length - position.current;
      if (backlog > 0) {
        // ~55 characters a second at rest, faster as the backlog grows.
        const rate = open ? 55 + backlog * 2.4 : 140 + backlog * 6;
        position.current = Math.min(text.length, position.current + Math.max(1, (rate * delta) / 1000));
        setShown(text.slice(0, Math.floor(position.current)));
      }
      if (open || position.current < text.length) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced, streaming, target]);

  return reduced ? target : shown;
}

/** Closes an unfinished ``` fence so half-streamed code renders as code. */
export function closeOpenFence(markdown: string) {
  const fences = markdown.match(/^```/gm)?.length || 0;
  return fences % 2 ? `${markdown}\n\`\`\`` : markdown;
}
