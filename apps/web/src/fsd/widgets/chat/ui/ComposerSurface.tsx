"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PluginLogo } from "@/shared/ui/plugin-logos";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { mentionRanges, type MentionChip } from "../model/composer-drafts";

/** Fired on the textarea whenever its text changes, including changes made in code. */
export const COMPOSER_VALUE_EVENT = "genyxo:composer-value";

const composerInput = () => document.getElementById("userInput") as HTMLTextAreaElement | null;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Moves the composer's buttons from the single row to the row under the text and back,
 * animating each one from where it was (FLIP), as ChatGPT does when a prompt wraps.
 */
function relayout(form: HTMLFormElement, change: () => void) {
  const parts = Array.from(form.querySelectorAll<HTMLElement>(":scope > button:not([hidden]), :scope > .input-content, :scope > .ws-tooltip-owner, :scope > .gx-voice-controls"));
  const before = parts.map((part) => part.getBoundingClientRect());
  change();
  if (reducedMotion()) return;
  parts.forEach((part, index) => {
    const after = part.getBoundingClientRect();
    const dx = before[index].left - after.left, dy = before[index].top - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    part.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 260, easing: "cubic-bezier(.2, .8, .2, 1)" });
  });
}

let resizeTimer = 0;
/**
 * Expanded fills the chat column like ChatGPT and Gemini: the greeting and the
 * conversation step aside and the text area grows to exactly the free height.
 */
function applyExpanded(form: HTMLFormElement, next: boolean) {
  const input = composerInput();
  const container = document.getElementById("chatContainer");
  const dock = form.closest<HTMLElement>(".chat-input-container");
  if (next && input && container && dock) {
    const style = getComputedStyle(container);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    // Everything in the composer dock except the text area: buttons row, borders, footer note.
    const chrome = dock.getBoundingClientRect().height - input.getBoundingClientRect().height;
    form.style.setProperty("--gx-expanded-h", `${Math.max(160, Math.floor(container.clientHeight - padding - chrome - 12))}px`);
  }
  // A longer, softer height transition only while expanding or collapsing.
  form.classList.add("is-resizing");
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => form.classList.remove("is-resizing"), 650);
  form.classList.toggle("is-expanded", next);
  container?.classList.toggle("is-composer-expanded", next);
  input?.dispatchEvent(new Event("input", { bubbles: true }));
}

let measureCanvas: HTMLCanvasElement | null = null;
function textWidth(text: string, input: HTMLTextAreaElement) {
  measureCanvas ??= document.createElement("canvas");
  const context = measureCanvas.getContext("2d");
  if (!context) return 0;
  const style = getComputedStyle(input);
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(text).width;
}

/**
 * Everything the bare textarea cannot draw: "@" mentions shown inline as linked
 * names with their logo, the two-row layout for long prompts and the Expand button.
 * The textarea keeps the text, so the chat controller, drafts and undo work as before.
 */
export function ComposerSurface({ form, mentions, onOpen }: { form: HTMLFormElement; mentions: MentionChip[]; onOpen: (chip: MentionChip) => void }) {
  const [text, setText] = useState("");
  const [scroll, setScroll] = useState(0);
  const [multiline, setMultiline] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null);
  // The mirror copies the textarea's box and type exactly, so its lines wrap the same way.
  const [mirror, setMirror] = useState<CSSProperties>({});
  const singleRowWidth = useRef(0);
  const state = useRef({ multiline, expanded });
  useLayoutEffect(() => { state.current = { multiline, expanded }; });

  useEffect(() => {
    const input = composerInput();
    if (!input) return;
    queueMicrotask(() => setWrapper(input.closest<HTMLElement>(".textarea-wrapper")));
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setText(input.value);
        setScroll(input.scrollTop);
        const style = getComputedStyle(input);
        const box: CSSProperties = { width: input.clientWidth, padding: style.padding, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, fontStyle: style.fontStyle, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing, textIndent: style.textIndent, tabSize: style.tabSize as CSSProperties["tabSize"] };
        setMirror((current) => JSON.stringify(current) === JSON.stringify(box) ? current : box);
        const { multiline: wide, expanded: tall } = state.current;
        const lineHeight = parseFloat(getComputedStyle(input).lineHeight) || 24;
        let next = wide;
        if (!input.value) next = false;
        else if (!wide) next = input.value.includes("\n") || input.scrollHeight > lineHeight * 1.6;
        // Back to one row only when the text would fit there again, so the layout never flickers.
        else if (!input.value.includes("\n") && singleRowWidth.current) next = textWidth(input.value, input) > singleRowWidth.current - 16;
        if (next !== wide) {
          if (next) singleRowWidth.current = input.clientWidth;
          relayout(form, () => form.classList.toggle("is-multiline", next));
          state.current.multiline = next;
          setMultiline(next);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (!next && tall) { applyExpanded(form, false); state.current.expanded = false; setExpanded(false); }
      });
    };
    const onScroll = () => setScroll(input.scrollTop);
    const observer = new ResizeObserver(measure);
    observer.observe(input);
    input.addEventListener("input", measure);
    input.addEventListener(COMPOSER_VALUE_EVENT, measure);
    input.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); input.removeEventListener("input", measure); input.removeEventListener(COMPOSER_VALUE_EVENT, measure); input.removeEventListener("scroll", onScroll); };
  }, [form]);

  // Sending collapses an expanded composer, like ChatGPT; a resized window re-fits it.
  useEffect(() => {
    const collapse = () => { if (!state.current.expanded) return; applyExpanded(form, false); state.current.expanded = false; setExpanded(false); };
    const refit = () => { if (state.current.expanded) applyExpanded(form, true); };
    document.addEventListener("genyxo:composer-sent", collapse);
    addEventListener("resize", refit);
    return () => { document.removeEventListener("genyxo:composer-sent", collapse); removeEventListener("resize", refit); };
  }, [form]);

  const ranges = mentionRanges(text, mentions);
  useEffect(() => { wrapper?.classList.toggle("has-mentions", ranges.length > 0); }, [wrapper, ranges.length]);

  const toggleExpanded = () => {
    const next = !expanded;
    applyExpanded(form, next);
    state.current.expanded = next;
    setExpanded(next);
    composerInput()?.focus({ preventScroll: true });
  };

  const pieces: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) pieces.push(text.slice(cursor, range.start));
    const { chip } = range;
    pieces.push(<span key={index} className="gx-tok" data-kind={chip.kind} role="link" title={chip.kind === "place" ? chip.address || chip.name : `Open ${chip.name}`} onMouseDown={(event) => event.preventDefault()} onClick={() => onOpen(chip)}>
      <span className="gx-tok-at">@<span className="gx-tok-icon">{chip.kind === "plugin" ? <PluginLogo id={chip.id} size={15} /> : chip.kind === "place" ? <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 2a6 6 0 0 1 6 6c0 4.5-6 10-6 10S4 12.5 4 8a6 6 0 0 1 6-6Zm0 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" /></svg> : <WorkspaceIcon name="sparkles" size={15} />}</span></span>{chip.name}
    </span>);
    cursor = range.end;
  });
  pieces.push(text.slice(cursor), "​");

  return <>
    {wrapper && ranges.length > 0 && createPortal(<div className="gx-compose-layer" aria-hidden="true">
      <div className="gx-compose-mirror" style={{ ...mirror, transform: `translateY(${-scroll}px)` }}>{pieces}</div>
    </div>, wrapper)}
    {(multiline || expanded) && createPortal(<button type="button" className="gx-expand-btn" aria-label={expanded ? "Collapse composer" : "Expand composer"} title={expanded ? "Collapse" : "Expand"} aria-pressed={expanded} onMouseDown={(event) => event.preventDefault()} onClick={toggleExpanded}>
      {expanded
        ? <svg key="collapse" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 16.5 8.5 11.5M8.5 15.5v-4h-4M16.5 3.5l-5 5M11.5 4.5v4h4" /></svg>
        : <svg key="expand" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8.5 11.5l-5 5M3.5 12.5v4h4M11.5 8.5l5-5M12.5 3.5h4v4" /></svg>}
    </button>, form)}
  </>;
}
