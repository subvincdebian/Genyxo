"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  floatingBounds,
  referenceHidden,
  useTopLayer,
} from "@/shared/lib/top-layer";
import { WorkspaceIcon } from "./workspace";
import styles from "./Select.module.css";

export type MultiOption = { value: string; label: string };

/** A select-styled menu where every option toggles on its own (stays open). */
export function MultiSelect({
  label,
  options,
  values,
  onToggle,
  emptyLabel,
  disabled,
}: {
  label: string;
  options: MultiOption[];
  values: string[];
  onToggle: (value: string, selected: boolean) => void;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    left: 0,
    top: 0,
    width: 220,
    visibility: "hidden" as "hidden" | "visible",
    transformOrigin: "top right",
  });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useId();
  useTopLayer(menu, present);
  useEffect(
    () => () => {
      if (closing.current) clearTimeout(closing.current);
    },
    [],
  );
  const summary =
    options
      .filter((option) => values.includes(option.value))
      .map((option) => option.label)
      .join(", ") || emptyLabel;
  const close = (restore = true) => {
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => setPresent(false), 150);
  };
  const show = () => {
    if (closing.current) clearTimeout(closing.current);
    setActive(0);
    setPosition((old) => ({ ...old, visibility: "hidden" }));
    setPresent(true);
    setOpen(true);
  };
  const toggle = (index: number) => {
    const option = options[index];
    if (option) onToggle(option.value, !values.includes(option.value));
  };
  useLayoutEffect(() => {
    if (!open || !menu.current) return;
    const place = () => {
      if (!trigger.current || !menu.current) return;
      const box = trigger.current.getBoundingClientRect();
      if (referenceHidden(box)) {
        close(false);
        return;
      }
      const width = Math.min(Math.max(box.width, 240), innerWidth - 16);
      const height = menu.current.offsetHeight;
      const bounds = floatingBounds();
      const above =
        box.bottom + height + 6 > bounds.bottom - 8 &&
        box.top - bounds.top > bounds.bottom - box.bottom;
      const left = Math.max(
        8,
        Math.min(box.right - width, innerWidth - width - 8),
      );
      const top = Math.max(
        bounds.top + 8,
        Math.min(
          above ? box.top - height - 6 : box.bottom + 6,
          bounds.bottom - height - 8,
        ),
      );
      setPosition((old) =>
        old.left === left &&
        old.top === top &&
        old.width === width &&
        old.visibility === "visible"
          ? old
          : {
              left,
              top,
              width,
              visibility: "visible",
              transformOrigin: above ? "bottom right" : "top right",
            },
      );
    };
    place();
    const focusFrame = requestAnimationFrame(() =>
      menu.current?.focus({ preventScroll: true }),
    );
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close(false);
    };
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) place();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  const keyboard = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setActive((old) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? options.length - 1
            : Math.max(
                0,
                Math.min(
                  options.length - 1,
                  old + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle(active);
    } else if (event.key === "Tab") close(false);
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={uid}
        aria-haspopup="listbox"
        disabled={disabled}
        className={styles.trigger}
        data-empty={values.length === 0 || undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show();
          } else if (event.key === "Escape") close();
        }}
      >
        <span>{summary}</span>
        <WorkspaceIcon name="chevron-down" size={15} />
      </button>
      {present &&
        createPortal(
          <div
            ref={menu}
            id={uid}
            className={styles.popup}
            popover="manual"
            data-state={open ? "open" : "closed"}
            data-side={
              position.transformOrigin.startsWith("bottom") ? "top" : "bottom"
            }
            inert={!open}
            aria-hidden={!open}
            style={position}
            tabIndex={-1}
            role={open ? "listbox" : undefined}
            aria-multiselectable="true"
            aria-label={label}
            aria-activedescendant={`${uid}-${active}`}
            onKeyDown={keyboard}
          >
            <div className={styles.list}>
              {options.map((option, index) => {
                const selected = values.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    id={`${uid}-${index}`}
                    aria-selected={selected}
                    data-active={active === index}
                    onPointerMove={() => setActive(index)}
                    onClick={() => toggle(index)}
                  >
                    <span>{option.label}</span>
                    <span className={styles.check} data-on={selected}>
                      <WorkspaceIcon name="check" size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.querySelector("dialog[open]") || document.body,
        )}
    </>
  );
}
