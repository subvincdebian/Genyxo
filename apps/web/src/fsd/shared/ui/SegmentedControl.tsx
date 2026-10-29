"use client";
import { useRef } from "react";
import styles from "./SegmentedControl.module.css";
export function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const group = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={group}
      role="radiogroup"
      aria-label={label}
      className={styles.group}
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const current = options.findIndex((option) => option.value === value);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? options.length - 1
              : (current +
                  (event.key === "ArrowRight" ? 1 : -1) +
                  options.length) %
                options.length;
        onChange(options[next].value);
        group.current
          ?.querySelectorAll<HTMLButtonElement>("button")
          [next]?.focus();
      }}
    >
      {options.map((option) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={value === option.value ? 0 : -1}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
