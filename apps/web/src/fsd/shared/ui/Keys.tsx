import { bindingKeys } from "@/shared/lib/interaction-settings";
import styles from "./Keys.module.css";

/** A key combination as small glass keycaps: Ctrl  Shift  C. */
export function Keys({ binding, keys, size = "md", className = "" }: { binding?: string; keys?: string[]; size?: "sm" | "md"; className?: string }) {
  const list = keys || (binding ? bindingKeys(binding) : []);
  if (!list.length) return null;
  return (
    <span className={`${styles.keys} ${className}`} data-size={size} aria-label={list.join(" + ")}>
      {list.map((key, index) => (
        <kbd key={index} aria-hidden="true">
          {key}
        </kbd>
      ))}
    </span>
  );
}
