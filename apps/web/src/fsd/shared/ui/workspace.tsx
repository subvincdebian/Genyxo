"use client";
import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/shared/i18n";
import { GenyxoIcon, hasGenyxoIcon } from "./genyxo-icons";

let scrollLocks = 0;
let previousOverflow = "";
export function lockWorkspaceScroll() {
  if (scrollLocks++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; }
  let released = false;
  return () => { if (released) return; released = true; if (--scrollLocks === 0) document.body.style.overflow = previousOverflow; };
}

const iconSymbols: Record<string, string> = {
  "search": "magnifying-glass-lg",
  "panel": "sidebar",
  "new": "square-and-pencil",
  "folder": "folder",
  "library": "books",
  "plugins": "plugin",
  "calendar": "calendar",
  "grid": "square-grid-2x2",
  "chevron": "chevron-right-md",
  "plus": "plus-lg",
  "more": "ellipsis-horizontal",
  "pin": "pin",
  "archive": "archive",
  "trash": "trash",
  "edit": "pencil",
  "move": "folder",
  "check": "checkmark-lg",
  "close": "xmark-lg",
  "settings": "gear",
  "help": "questionmark-circle",
  "arrow": "arrow-right-lg",
  "arrow-left": "arrow-left-lg",
  "file": "document-text",
  "image": "photo-on-square",
  "video": "video",
  "sparkles": "sparkles",
  "download": "arrow-down-line-horizontal",
  "link": "link",
  "share": "arrow-up-open-base",
  "copy": "square-on-square",
  "clock": "clock",
  "user": "person",
  "sort": "sliders",
  "upload": "arrow-up-line-horizontal",
  "external": "open-link",
  "list": "list-bullet",
  "info": "info-circle",
  "heart": "heart",
  "play": "play",
  "pause": "pause-sm-fill",
  "maps": "pin-location",
  "cube": "cube",
  "sites": "sites"
};
// Keep source geometry in one local sprite; motion never changes the icon's resting shape.
export function WorkspaceIcon({ name, size = 20 }: { name: string; size?: number }) {
  const aliases: Record<string, string> = { plug: "plugins", "arrow-right": "arrow", "chevron-down": "chevron" };
  const key = aliases[name] || name;
  if (hasGenyxoIcon(key)) return <GenyxoIcon name={key} size={size} className={name === "chevron-down" ? "gi-rotate-down" : ""}/>;
  const symbol = iconSymbols[key];
  return <svg className="ws-icon" data-icon={key} width={size} height={size} viewBox="0 0 20 20" fill="currentColor" style={name === "chevron-down" ? { transform: "rotate(90deg)" } : undefined} aria-hidden="true" focusable="false">
    <g className="ws-icon-motion">
      {symbol ? <use href={`/images/workspace-icons.svg#${symbol}-light-20`}/> : key === "menu" ? <path d="M3.5 5h13M3.5 10h13M3.5 15h13" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/> : key === "logout" ? <path d="M8 3H3v14h5m-1-7h10m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/> : <path d="m10 2 2.5 5.2 5.8.8-4.2 4.1 1 5.7-5.1-2.7-5.1 2.7 1-5.7L2 8l5.5-.8L10 2Z" fill={name === "star-filled" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>}
    </g>
  </svg>;
}

export function WorkspaceDialog({ title, onClose, children, wide = false, className = "" }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  const id = useId();
  const { t } = useLanguage();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockWorkspaceScroll();
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); unlock(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} aria-labelledby={id} className={`ws-dialog ${wide ? "ws-dialog-wide" : ""} ${className}`} onCancel={(e) => { e.preventDefault(); close.current(); }} onClick={(e) => { if (e.target === e.currentTarget) { const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX < bounds.left || e.clientX > bounds.right || e.clientY < bounds.top || e.clientY > bounds.bottom) close.current(); } }}>
    <div className="ws-dialog-header"><h2 id={id}>{title}</h2><WorkspaceTooltip label={t("workspace.close", "Close dialog")} side="bottom"><button type="button" className="ws-icon-btn" aria-label={t("workspace.close", "Close dialog")} onClick={onClose}><WorkspaceIcon name="close"/></button></WorkspaceTooltip></div>
    <div className="ws-dialog-body">{children}</div>
  </dialog>;
}

export function WorkspaceMenu({ children, onClose, anchor, trigger, positionTarget, className = "", placement = "bottom" }: { children: ReactNode; onClose: () => void; anchor?: { x: number; y: number }; trigger?: HTMLElement | null; positionTarget?: HTMLElement | null; className?: string; placement?: "top" | "bottom" | "right" | "auto" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const close = useRef(onClose);
  useLayoutEffect(() => { close.current = onClose; }, [onClose]);
  useLayoutEffect(() => {
    const element = ref.current; if (!element) return;
    const previous = trigger || document.activeElement as HTMLElement | null;
    // positionTarget lets a menu sit against a larger surface (the composer) than its trigger.
    const target = (positionTarget || previous)?.getBoundingClientRect();
    // Layout size, not getBoundingClientRect: the entrance animation starts scaled down.
    const box = { width: element.offsetWidth, height: element.offsetHeight };
    let x = anchor?.x ?? target?.left ?? 16;
    // "auto" opens below when it fits, otherwise above, otherwise on the roomier side with a capped height.
    let side = placement;
    let maxHeight: number | undefined;
    if (placement === "auto" && target) {
      const below = innerHeight - target.bottom - 14, above = target.top - 14;
      side = box.height <= below ? "bottom" : box.height <= above ? "top" : below >= above ? "bottom" : "top";
      if (box.height > Math.max(below, above)) { maxHeight = Math.max(below, above); box.height = maxHeight; }
    }
    const anchorY = anchor?.y ?? (side === "top" ? target?.top : side === "bottom" && target ? target.bottom + 6 : target?.bottom) ?? 16;
    let y = side === "top" ? anchorY - box.height - 6 : anchorY;
    if (placement === "right" && target) {
      x = target.right + 6;
      y = target.top - 12;
      if (x + box.width > innerWidth - 8) {
        if (target.left - box.width - 6 >= 8) x = target.left - box.width - 6;
        else { x = target.left; y = target.bottom + 6; }
      }
    }
    setStyle({ left: Math.max(8, Math.min(x, innerWidth - box.width - 8)), top: Math.max(8, Math.min(y, innerHeight - box.height - 8)), visibility: "visible", ...(maxHeight ? { maxHeight } : {}), transformOrigin: side === "top" ? "bottom left" : "top left" });
    const first = element.querySelector<HTMLElement>('button:not(:disabled),a[href],[role="menuitem"]'); first?.focus({ preventScroll: true });
    // A trigger click is handled at click time, before React can reopen the menu.
    // Closing on its pointerdown would unmount this handler before that click.
    const outside = (event: PointerEvent) => { if (!element.contains(event.target as Node) && !previous?.contains(event.target as Node) && !(event.target as Element).closest?.("[data-ws-submenu]")) close.current(); };
    const toggle = (event: MouseEvent) => {
      if (previous?.contains(event.target as Node) && !element.contains(event.target as Node)) {
        event.preventDefault(); event.stopPropagation(); close.current();
      }
    };
    const resize = () => close.current();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("click", toggle, true);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("click", toggle, true); window.removeEventListener("resize", resize); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [anchor?.x, anchor?.y, placement, trigger, positionTarget]);
  return createPortal(<div ref={ref} role="menu" className={`ws-menu ${className}`} style={style} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[role="menuitem"]') || []).filter((item) => !item.hidden);
      const index = items.indexOf(document.activeElement as HTMLElement);
      items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
    if (event.key === "Tab") onClose();
  }}>{children}</div>, document.querySelector("dialog[open]") || document.body);
}

export function WorkspaceTooltip({ label, shortcut, children, side = "right", disabled = false }: { label: string; shortcut?: string; children: ReactElement; side?: "right" | "bottom"; disabled?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const child = children as ReactElement<{ "aria-describedby"?: string; "aria-expanded"?: boolean; "aria-haspopup"?: boolean | string }>;
  const enabled = !disabled && !(child.props["aria-expanded"] && child.props["aria-haspopup"]);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });
  const cancelTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const hide = () => {
    cancelTimer(); setVisible(false);
    timer.current = setTimeout(() => { setAnchor(null); timer.current = null; }, 140);
  };
  const open = () => {
    if (!enabled) return;
    cancelTimer();
    const rect = ref.current?.getBoundingClientRect();
    if (rect) { setAnchor(rect); setVisible(true); }
  };
  useLayoutEffect(() => {
    if (!anchor || !tip.current) return;
    // Measure unconstrained: a fixed box left near the edge from an earlier
    // position shrinks to fit, and the entrance animation scales it down.
    tip.current.style.left = "0px";
    const box = { width: tip.current.offsetWidth, height: tip.current.offsetHeight };
    let x = side === "bottom" ? anchor.left + (anchor.width - box.width) / 2 : anchor.right + 8;
    let y = side === "bottom" ? anchor.bottom + 7 : anchor.top + (anchor.height - box.height) / 2;
    if (side === "right" && x + box.width > innerWidth - 8) { x = anchor.left + (anchor.width - box.width) / 2; y = anchor.bottom + 7; }
    if (y + box.height > innerHeight - 8) y = anchor.top - box.height - 7;
    setPosition({ left: Math.max(8, Math.min(x, innerWidth - box.width - 8)), top: Math.max(8, Math.min(y, innerHeight - box.height - 8)), visibility: "visible" });
  }, [anchor, label, shortcut, side]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => { setVisible(false); setAnchor(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    document.addEventListener("scroll", dismiss, true);
    return () => { document.removeEventListener("keydown", escape); window.removeEventListener("resize", dismiss); document.removeEventListener("scroll", dismiss, true); };
  }, [visible]);
  const description = [child.props["aria-describedby"], visible && enabled ? id : undefined].filter(Boolean).join(" ") || undefined;
  return <span ref={ref} className="ws-tooltip-owner" onMouseEnter={open} onMouseLeave={hide} onFocus={(event) => { if ((event.target as HTMLElement).matches(":focus-visible")) open(); }} onBlur={hide} onPointerDownCapture={hide}>
    {cloneElement(child, { "aria-describedby": description })}
    {anchor && enabled && createPortal(<span ref={tip} id={id} role="tooltip" data-state={visible ? "open" : "closed"} className="ws-tooltip" style={position}>{label}{shortcut && <kbd>{shortcut}</kbd>}</span>, document.querySelector("dialog[open]") || document.body)}
  </span>;
}

type Point = { x: number; y: number };
const inTriangle = (p: Point, a: Point, b: Point, c: Point) => {
  const area = (u: Point, v: Point, w: Point) => (u.x - w.x) * (v.y - w.y) - (v.x - w.x) * (u.y - w.y);
  const d1 = area(p, a, b), d2 = area(p, b, c), d3 = area(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

/**
 * A menu item that opens a side flyout on hover, focus or tap. While the
 * pointer travels from the item toward the flyout it stays open (the "safe
 * triangle"), so diagonal moves never collapse it. Arrow keys open and close it.
 */
export function WorkspaceSubmenu({ label, icon, iconNode, hint, children, className = "" }: { label: ReactNode; icon?: string; iconNode?: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const [side, setSide] = useState<"right" | "left">("right");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exit = useRef<Point | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const show = (delay = 70) => { clear(); timer.current = setTimeout(() => setOpen(true), delay); };
  const hide = (delay = 160) => { clear(); timer.current = setTimeout(() => setOpen(false), delay); };
  useEffect(() => () => clear(), []);

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const item = trigger.current.getBoundingClientRect();
    const width = panel.current.offsetWidth, height = panel.current.offsetHeight;
    const right = item.right + width + 10 <= innerWidth;
    setSide(right ? "right" : "left");
    setStyle({ left: right ? item.right + 4 : Math.max(8, item.left - width - 4), top: Math.max(8, Math.min(item.top - 6, innerHeight - height - 8)), visibility: "visible" });
  }, [open]);

  // Safe triangle: from where the pointer left the item to the flyout's near edge.
  useEffect(() => {
    if (!open) return;
    const move = (event: PointerEvent) => {
      const point = { x: event.clientX, y: event.clientY };
      const item = trigger.current?.getBoundingClientRect(), box = panel.current?.getBoundingClientRect();
      if (!item || !box) return;
      const over = (r: DOMRect) => point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom;
      if (over(item) || over(box)) { clear(); exit.current = null; return; }
      const origin = exit.current;
      const edge = side === "right" ? box.left : box.right;
      if (origin && inTriangle(point, origin, { x: edge, y: box.top - 8 }, { x: edge, y: box.bottom + 8 })) { if (!timer.current) hide(420); return; }
      hide(90);
    };
    document.addEventListener("pointermove", move);
    return () => document.removeEventListener("pointermove", move);
    // hide/clear only touch refs and state setters, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, side]);

  const focusFirst = () => requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('button:not(:disabled),a[href],[role^="menuitem"]')?.focus({ preventScroll: true }));
  return <>
    <button
      ref={trigger}
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      className={`ws-sidebar-menu-item ws-submenu-trigger ${className}`}
      onPointerEnter={() => show()}
      onPointerLeave={(event) => { exit.current = { x: event.clientX, y: event.clientY }; }}
      onClick={() => { clear(); setOpen((value) => !value); }}
      onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") { event.preventDefault(); clear(); setOpen(true); focusFirst(); } }}
    >
      {iconNode || (icon && <WorkspaceIcon name={icon} size={16} />)}
      <span className="ws-submenu-label">{label}{hint && <small>{hint}</small>}</span>
      <span className="ws-submenu-chevron"><WorkspaceIcon name="chevron" size={14} /></span>
    </button>
    {open && createPortal(<div
      ref={panel}
      role="menu"
      data-ws-submenu=""
      data-side={side}
      className="ws-menu ws-submenu"
      style={style}
      onPointerEnter={clear}
      onKeyDown={(event) => {
        // Keys stay inside the flyout; React would otherwise bubble them to the parent menu.
        event.stopPropagation();
        if (event.key === "Escape" || event.key === "ArrowLeft") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') || []);
          const index = items.indexOf(document.activeElement as HTMLElement);
          items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
        }
      }}
    >{children}</div>, document.querySelector("dialog[open]") || document.body)}
  </>;
}
