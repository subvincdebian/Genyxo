"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./AnimatedNumber.module.css";
export function AnimatedNumber({
  value,
  locale,
  currency,
}: {
  value: number;
  locale: string;
  currency?: string;
}) {
  const [progress, setProgress] = useState(0);
  const played = useRef(false);
  useEffect(() => {
    if (played.current || !Number.isFinite(value)) return;
    if (
      document.documentElement.dataset.gxMotion === "on" ||
      (document.documentElement.dataset.gxMotion !== "off" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      played.current = true;
      queueMicrotask(() => setProgress(1));
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 760);
      setProgress(1 - Math.pow(1 - p, 4));
      if (p < 1) frame = requestAnimationFrame(tick);
      else played.current = true;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  const formatter = new Intl.NumberFormat(
    locale,
    currency ? { style: "currency", currency } : { maximumFractionDigits: 2 },
  );
  const current = formatter.format(value * progress);
  return (
    <span className={styles.number} aria-label={formatter.format(value)}>
      <span aria-hidden="true">
        {Array.from(current).map((digit, index) => (
          <span className={styles.slot} key={index}>
            <span
              className={
                /\d/.test(digit) && progress < 1 ? styles.rolling : undefined
              }
              key={digit}
            >
              {digit}
            </span>
          </span>
        ))}
      </span>
    </span>
  );
}
