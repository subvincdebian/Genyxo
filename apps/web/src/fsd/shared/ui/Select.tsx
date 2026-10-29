"use client";
import {
  Children,
  isValidElement,
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTopLayer } from "@/shared/lib/top-layer";
import { createPortal } from "react-dom";
import { useLanguage } from "@/shared/i18n";
import { WorkspaceIcon } from "./workspace";
import styles from "./Select.module.css";
type Option = { value: string; children: ReactNode; disabled?: boolean };
export function Select({
  value,
  onChange,
  children,
  disabled,
  id,
  renderOption,
  "aria-label": label,
}: {
  value: string | number;
  onChange: (event: {
    target: { value: string };
    currentTarget: HTMLButtonElement;
  }) => void;
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  renderOption?: (value: string, label: ReactNode) => ReactNode;
  "aria-label"?: string;
}) {
  const { t } = useLanguage();
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => child.props as Option);
  const [open, setOpen] = useState(false);
  const [present, setPresent] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [query, setQuery] = useState("");
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
  const uid = useId();
  const selected = options.find(
    (option) => String(option.value) === String(value),
  );
  const visible = options.filter((option) =>
    String(option.children)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  useTopLayer(menu, present);
  useEffect(
    () => () => {
      if (closing.current) clearTimeout(closing.current);
    },
    [],
  );
  const close = (restore = true) => {
    setOpen(false);
    if (restore) trigger.current?.focus({ preventScroll: true });
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => {
      setPresent(false);
      setQuery("");
    }, 150);
  };
  const show = () => {
    if (closing.current) clearTimeout(closing.current);
    setQuery("");
    setActive(
      Math.max(
        0,
        options.findIndex((option) => String(option.value) === String(value)),
      ),
    );
    setPosition((old) => ({ ...old, visibility: "hidden" }));
    setPresent(true);
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = visible[index];
    if (option && !option.disabled) {
      onChange({
        target: { value: String(option.value) },
        currentTarget: trigger.current!,
      });
      close();
    }
  };
  useLayoutEffect(() => {
    if (!open || !menu.current) return;
    const place = () => {
      if (!trigger.current || !menu.current) return;
      const box = trigger.current.getBoundingClientRect();
      const width = Math.min(Math.max(box.width, 220), innerWidth - 16);
      const height = menu.current.offsetHeight;
      const above =
        box.bottom + height + 6 > innerHeight - 8 &&
        box.top > innerHeight - box.bottom;
      const left = Math.max(
        8,
        Math.min(box.right - width, innerWidth - width - 8),
      );
      const top = Math.max(
        8,
        Math.min(
          above ? box.top - height - 6 : box.bottom + 6,
          innerHeight - height - 8,
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
    const search = menu.current.querySelector<HTMLInputElement>("input");
    if (search) search.focus({ preventScroll: true });
    else menu.current.focus({ preventScroll: true });
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
    const observer = new ResizeObserver(place);
    observer.observe(trigger.current!);
    observer.observe(menu.current);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);
  const keyboard = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setActive((old) =>
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? visible.length - 1
            : Math.max(
                0,
                Math.min(
                  visible.length - 1,
                  old + (event.key === "ArrowDown" ? 1 : -1),
                ),
              ),
      );
    } else if (event.key === "Enter" || event.key === " ") {
      if (event.target instanceof HTMLInputElement && event.key === " ") return;
      event.preventDefault();
      choose(active);
    } else if (event.key === "Tab") close(false);
  };
  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={uid}
        aria-haspopup="listbox"
        disabled={disabled}
        className={styles.trigger}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show();
          } else if (event.key === "Escape") close();
        }}
      >
        <span>
          {renderOption
            ? renderOption(String(value), selected?.children || value)
            : selected?.children || value}
        </span>
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
            aria-label={label}
            aria-activedescendant={`${uid}-${active}`}
            onKeyDown={keyboard}
          >
            {options.length > 12 && (
              <input
                autoFocus
                value={query}
                aria-label={t("account.search_options", "Search options")}
                placeholder="Search…"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(0);
                }}
              />
            )}
            <div className={styles.list}>
              {visible.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  id={`${uid}-${index}`}
                  aria-selected={String(value) === String(option.value)}
                  disabled={option.disabled}
                  data-active={active === index}
                  ref={(element) => {
                    if (active === index && element) {
                      const list = element.parentElement;
                      if (list) {
                        const top = element.offsetTop - list.offsetTop;
                        if (top < list.scrollTop) list.scrollTop = top;
                        else if (
                          top + element.offsetHeight >
                          list.scrollTop + list.clientHeight
                        )
                          list.scrollTop =
                            top + element.offsetHeight - list.clientHeight;
                      }
                    }
                  }}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span>
                    {renderOption
                      ? renderOption(String(option.value), option.children)
                      : option.children}
                  </span>
                  {String(value) === String(option.value) && (
                    <WorkspaceIcon name="check" size={16} />
                  )}
                </button>
              ))}
            </div>
          </div>,
          document.querySelector("dialog[open]") || document.body,
        )}
    </>
  );
}
