"use client";
import {
  Children,
  isValidElement,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  "aria-label": label,
}: {
  value: string | number;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}) {
  const { t } = useLanguage();
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => child.props as Option);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 220 });
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
  const close = () => {
    setOpen(false);
    setQuery("");
    trigger.current?.focus({ preventScroll: true });
  };
  const choose = (index: number) => {
    const option = visible[index];
    if (option && !option.disabled) {
      onChange({ target: { value: String(option.value) } });
      close();
    }
  };
  useLayoutEffect(() => {
    if (!open) return;
    const box = trigger.current!.getBoundingClientRect();
    const width = Math.min(Math.max(box.width, 220), innerWidth - 16);
    setPosition({
      left: Math.max(8, Math.min(box.right - width, innerWidth - width - 8)),
      top: Math.max(
        8,
        box.bottom + 310 > innerHeight ? box.top - 300 : box.bottom + 6,
      ),
      width,
    });
    const search = menu.current?.querySelector<HTMLInputElement>("input");
    if (search) search.focus();
    else menu.current?.focus();
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", resize);
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
    } else if (event.key === "Tab") setOpen(false);
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
        onClick={() => {
          setQuery("");
          setActive(
            Math.max(
              0,
              options.findIndex(
                (option) => String(option.value) === String(value),
              ),
            ),
          );
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === "Escape") setOpen(false);
        }}
      >
        <span>{selected?.children || value}</span>
        <WorkspaceIcon name="chevron-down" size={15} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={uid}
            className={styles.popup}
            style={position}
            tabIndex={-1}
            role="listbox"
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
                  <span>{option.children}</span>
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
