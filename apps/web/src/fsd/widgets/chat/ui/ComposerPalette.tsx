"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { WorkspaceIcon } from "@/shared/ui/workspace";

export type PaletteEntry = { id: string; icon: ReactNode; title: string; hint?: string; keywords?: string; run: () => void; submenu?: boolean; current?: boolean; busy?: boolean };
export type PaletteSection = { id: string; label?: string; entries: PaletteEntry[]; loading?: boolean; empty?: string };

export const PALETTE_ID = "gxComposerPalette";
export const optionId = (entry: PaletteEntry) => `${PALETTE_ID}-${entry.id}`;

/**
 * The list behind "+", "@" and "/". It sits against the composer: below it while
 * the composer is centred on the welcome screen, above it once a chat fills the page.
 */
export function ComposerPalette({ anchor, compact, sections, active, onActive, onPick, title, onBack, search, closing, panelRef }: {
  anchor: HTMLElement;
  compact: boolean;
  sections: PaletteSection[];
  active: number;
  onActive: (index: number) => void;
  onPick: (entry: PaletteEntry) => void;
  title?: string;
  onBack?: () => void;
  search?: ReactNode;
  closing: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" });
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(compact ? 340 : rect.width, innerWidth - 16);
      const left = Math.max(8, Math.min(rect.left, innerWidth - width - 8));
      const below = innerHeight - rect.bottom - 20, above = rect.top - 20;
      const next = below >= 320 || below >= above ? "bottom" : "top";
      const maxHeight = Math.max(160, Math.min(compact ? 520 : 440, next === "bottom" ? below : above));
      setSide(next);
      setStyle(next === "bottom" ? { left, width, top: rect.bottom + 8, maxHeight } : { left, width, bottom: innerHeight - rect.top + 8, maxHeight });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor);
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    visualViewport?.addEventListener("resize", place);
    return () => { observer.disconnect(); removeEventListener("resize", place); removeEventListener("scroll", place, true); visualViewport?.removeEventListener("resize", place); };
  }, [anchor, compact]);

  useLayoutEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, sections]);

  let index = -1;
  const hasEntries = sections.some((section) => section.entries.length || section.loading);
  return createPortal(<div ref={panelRef} className={`gx-cp${compact ? " is-compact" : ""}`} data-side={side} data-state={closing ? "closing" : "open"} style={style}>
    {search}
    {title && <button type="button" className="gx-cp-back" onMouseDown={(event) => event.preventDefault()} onClick={onBack}>
      <WorkspaceIcon name="arrow-left" size={16} /><span>{title}</span>
    </button>}
    <div ref={list} key={title || "root"} className={`gx-cp-list${title ? " is-sub" : ""}`} id={PALETTE_ID} role="listbox" aria-label={title || "Composer actions"}>
      {sections.map((section) => (section.entries.length || section.loading || section.empty) ? <div key={section.id} className="gx-cp-section" role="group" aria-label={section.label}>
        {section.label && <p className="gx-cp-label">{section.label}</p>}
        {section.entries.map((entry) => {
          index++;
          const position = index;
          return <div key={entry.id} id={optionId(entry)} role="option" aria-selected={position === active} aria-current={entry.current ? "true" : undefined} className="gx-cp-row"
            onMouseDown={(event) => event.preventDefault()} onMouseMove={() => { if (position !== active) onActive(position); }} onClick={() => onPick(entry)}>
            <span className="gx-cp-icon">{entry.icon}</span>
            <span className="gx-cp-title">{entry.title}</span>
            {entry.hint && <span className="gx-cp-hint">{entry.hint}</span>}
            {entry.busy ? <span className="gx-cp-spinner" /> : entry.current ? <span className="gx-cp-end"><WorkspaceIcon name="check" size={15} /></span> : entry.submenu ? <span className="gx-cp-end"><WorkspaceIcon name="chevron" size={15} /></span> : null}
          </div>;
        })}
        {section.loading && !section.entries.length && <div className="gx-cp-loading" role="status" aria-label="Loading"><span /><span /></div>}
        {section.empty && !section.loading && !section.entries.length && <p className="gx-cp-empty">{section.empty}</p>}
      </div> : null)}
      {!hasEntries && !sections.some((section) => section.empty) && <p className="gx-cp-empty">No matches</p>}
    </div>
  </div>, document.body);
}
