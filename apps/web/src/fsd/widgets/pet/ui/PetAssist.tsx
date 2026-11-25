"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { readSelection, type PetReminder, type PetSelection, type SelectionAction } from "../model/pet-assist";
import styles from "./PetAssist.module.css";

/**
 * A reminder in a small glass bubble beside the pet. The pet jumps when it
 * arrives; the bubble stays until it is opened, snoozed or dismissed.
 */
export function PetNudge({
  reminder,
  above,
  left,
  onOpen,
  onSnooze,
  onDismiss,
}: {
  reminder: PetReminder;
  above: boolean;
  left: boolean;
  onOpen: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      className={styles.nudge}
      data-above={above}
      data-left={left}
      role="status"
      aria-live="polite"
      aria-label={`Reminder: ${reminder.title}`}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header>
        <span className={styles.nudgeIcon} aria-hidden="true">
          <WorkspaceIcon name={reminder.failed ? "info" : "clock"} size={15} />
        </span>
        <strong title={reminder.title}>{reminder.title}</strong>
        <button type="button" className={styles.nudgeClose} aria-label="Dismiss reminder" onClick={onDismiss}>
          <WorkspaceIcon name="close" size={14} />
        </button>
      </header>
      {reminder.text && <p>{reminder.text}</p>}
      <footer>
        <button type="button" className={styles.ghost} onClick={onSnooze}>
          In 10 min
        </button>
        {reminder.link && (
          <button type="button" className={styles.primary} onClick={onOpen}>
            {reminder.failed ? "Review" : "Open"}
          </button>
        )}
      </footer>
    </section>
  );
}

const ACTIONS: Array<{ action: SelectionAction; label: string; icon: string }> = [
  { action: "summarize", label: "Summarize", icon: "list" },
  { action: "explain", label: "Explain", icon: "sparkles" },
  { action: "ask", label: "Ask", icon: "chat" },
];

/**
 * Text selected anywhere on the page gets a small glass bar above it:
 * summarize, explain, or ask the pet about it.
 */
export function PetSelectionBar({ petName, onAction }: { petName: string; onAction: (action: SelectionAction, text: string) => void }) {
  const [selection, setSelection] = useState<PetSelection | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer = 0;
    // Read the selection once the user lets go, so the bar does not chase the cursor.
    const check = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setSelection(readSelection()), 140);
    };
    const pointerDown = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) setSelection(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
      else if (event.shiftKey || event.key === "a") check();
    };
    const changed = () => {
      if (window.getSelection()?.isCollapsed) setSelection(null);
    };
    const hide = () => setSelection(null);
    document.addEventListener("pointerup", check);
    document.addEventListener("pointerdown", pointerDown);
    document.addEventListener("keyup", key);
    document.addEventListener("selectionchange", changed);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerup", check);
      document.removeEventListener("pointerdown", pointerDown);
      document.removeEventListener("keyup", key);
      document.removeEventListener("selectionchange", changed);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

  // Centred over the selection; below it when there is no room above.
  const place = useCallback(
    (node: HTMLDivElement | null) => {
      bar.current = node;
      if (!node || !selection) return;
      const { rect } = selection;
      const { offsetWidth: width, offsetHeight: height } = node;
      const below = rect.top < height + 16;
      node.toggleAttribute("data-below", below);
      node.style.top = `${below ? rect.bottom + 10 : rect.top - height - 10}px`;
      node.style.left = `${Math.max(8, Math.min(innerWidth - width - 8, rect.left + rect.width / 2 - width / 2))}px`;
      node.style.visibility = "visible";
    },
    [selection],
  );

  if (!selection) return null;
  return createPortal(
    <div
      ref={place}
      className={styles.selectionBar}
      data-pet-layer=""
      role="toolbar"
      aria-label={`Ask ${petName} about the selected text`}
      style={{ top: 0, left: 0, visibility: "hidden" } as CSSProperties}
      onPointerDown={(event) => event.preventDefault()}
    >
      {ACTIONS.map(({ action, label, icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => {
            const text = selection.text;
            setSelection(null);
            window.getSelection()?.removeAllRanges();
            onAction(action, text);
          }}
        >
          <WorkspaceIcon name={icon} size={15} />
          {action === "ask" ? `Ask ${petName}` : label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

/** Ways to start when the pet's chat is empty. */
export function PetSuggestions({ onExplainPage }: { onExplainPage: () => void }) {
  return (
    <div className={styles.suggestions}>
      <button type="button" onClick={onExplainPage}>
        <WorkspaceIcon name="search" size={16} />
        <span>
          <strong>Explain this page</strong>
          <small>What it is and what you can do here</small>
        </span>
      </button>
      <p className={styles.tip}>Select text anywhere to summarize or explain it.</p>
    </div>
  );
}
