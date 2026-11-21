"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { workspaceRequest } from "@/features/workspace";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { buildPreviewDocument, fileExtension, normalizeLanguage, previewMode, suggestTitle } from "../model/preview";
import "./canvas.css";

export type CanvasOpenDetail = { title?: string; language?: string; content: string };
type CanvasDoc = { key: string; title: string; language: string; original: string; content: string; libraryId?: number; savedContent?: string };
type ConsoleLine = { level: string; text: string };

const WIDTH_KEY = "genyxo:canvas-width";
const MAX_DOCS = 8;
const docKey = (language: string, content: string) => `${normalizeLanguage(language)}:${content.length}:${content.slice(0, 64)}`;

/** Opens a document from anywhere in the workspace (legacy chat controller included). */
export function openCanvas(detail: CanvasOpenDetail) {
  document.dispatchEvent(new CustomEvent("genyxo:canvas-open", { detail }));
}

export function CanvasPanel({ active }: { active: boolean }) {
  const [docs, setDocs] = useState<CanvasDoc[]>([]);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(560);
  const [resizing, setResizing] = useState(false);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState("");
  const [runId, setRunId] = useState(0);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [switcher, setSwitcher] = useState<HTMLElement | null>(null);
  const [more, setMore] = useState<HTMLElement | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const doc = docs.find((item) => item.key === currentKey) || null;
  const mode = doc ? previewMode(doc.language) : "none";

  const notify = (message: string, type = "success") => document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));

  useEffect(() => {
    try { const stored = Number(localStorage.getItem(WIDTH_KEY)); if (stored >= 360) queueMicrotask(() => setWidth(stored)); } catch { /* Width preference is optional. */ }
    const openEvent = (event: Event) => {
      const detail = (event as CustomEvent<CanvasOpenDetail>).detail;
      if (!detail?.content) return;
      const language = normalizeLanguage(detail.language || "markdown");
      const key = docKey(language, detail.content);
      setDocs((items) => items.some((item) => item.key === key) ? items : [{ key, language, title: detail.title || suggestTitle(language, detail.content), original: detail.content, content: detail.content }, ...items].slice(0, MAX_DOCS));
      setCurrentKey(key);
      setView(previewMode(language) === "none" ? "code" : "preview");
      setConsoleLines([]);
      setOpen(true);
    };
    const close = () => setOpen(false);
    document.addEventListener("genyxo:canvas-open", openEvent);
    document.addEventListener("genyxo:workspace-new", close);
    return () => { document.removeEventListener("genyxo:canvas-open", openEvent); document.removeEventListener("genyxo:workspace-new", close); };
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-canvas-open", open && active);
    return () => document.documentElement.removeAttribute("data-canvas-open");
  }, [open, active]);

  // Rebuild the preview shortly after typing stops, so edits feel live but stay cheap.
  useEffect(() => {
    if (!doc || mode !== "frame") return;
    const timer = setTimeout(() => { setConsoleLines([]); setPreviewDoc(buildPreviewDocument(doc.language, doc.content)); }, 350);
    return () => clearTimeout(timer);
  }, [doc, mode, runId]);

  useEffect(() => {
    const message = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || !event.data?.__genyxoCanvas) return;
      const line = { level: String(event.data.level), text: (event.data.args as string[]).join(" ") };
      setConsoleLines((lines) => [...lines.slice(-199), line]);
      if (line.level === "error") setConsoleOpen(true);
    };
    window.addEventListener("message", message);
    return () => window.removeEventListener("message", message);
  }, []);

  const markdown = useMemo(() => doc && mode === "markdown" ? DOMPurify.sanitize(marked.parse(doc.content, { async: false }) as string) : "", [doc, mode]);
  const lineCount = useMemo(() => (doc?.content.match(/\n/g)?.length || 0) + 1, [doc?.content]);

  const update = useCallback((patch: Partial<CanvasDoc>) => setDocs((items) => items.map((item) => item.key === currentKey ? { ...item, ...patch } : item)), [currentKey]);

  const copy = async () => {
    if (!doc) return;
    try { await navigator.clipboard.writeText(doc.content); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch { notify("Copy is blocked by the browser.", "error"); }
  };
  const download = () => {
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([doc.content], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "") || "canvas"}.${fileExtension(doc.language)}`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const save = async () => {
    if (!doc || saving) return;
    setSaving(true);
    try {
      const name = /\.\w+$/.test(doc.title) ? doc.title : `${doc.title}.${fileExtension(doc.language)}`;
      // The first save creates a library document; later saves update that same item.
      const saved = doc.libraryId
        ? await workspaceRequest<{ id: number }>(`library/${doc.libraryId}`, { method: "PATCH", body: JSON.stringify({ name, content: doc.content }) })
        : await workspaceRequest<{ id: number }>("library", { method: "POST", body: JSON.stringify({ name, type: "document", content: doc.content }) });
      update({ libraryId: saved.id ?? doc.libraryId, savedContent: doc.content });
      notify(doc.libraryId ? "Library document updated" : "Saved to Library");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (expanded) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const right = panel.current?.getBoundingClientRect().right ?? innerWidth;
    const grab = right - width - event.clientX; // keep the grab offset so the edge stays under the pointer
    setResizing(true);
    const move = (moveEvent: PointerEvent) => setWidth(Math.round(Math.min(Math.max(right - moveEvent.clientX - grab, 360), innerWidth * 0.72)));
    const end = () => {
      setResizing(false);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      setWidth((value) => { try { localStorage.setItem(WIDTH_KEY, String(value)); } catch { /* Width preference is optional. */ } return value; });
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  };

  const visible = open && active && doc;
  const dirty = doc ? doc.content !== doc.original : false;
  const unsaved = doc ? doc.libraryId !== undefined && doc.content !== doc.savedContent : false;

  return <aside
    ref={panel}
    className={`gx-canvas${visible ? " is-open" : ""}${expanded ? " is-expanded" : ""}${resizing ? " is-resizing" : ""}`}
    style={{ "--gx-canvas-w": `${width}px` } as CSSProperties}
    aria-label="Canvas"
    aria-hidden={!visible}
    inert={!visible ? true : undefined}
    onKeyDown={(event) => { if (event.key === "Escape" && !event.defaultPrevented) { event.stopPropagation(); if (expanded) setExpanded(false); else setOpen(false); } }}
  >
    <div className="gx-canvas-resize" role="separator" aria-orientation="vertical" aria-label="Resize canvas" onPointerDown={startResize} onDoubleClick={() => setWidth(560)} />
    {doc && <div className="gx-canvas-inner">
      <header className="gx-canvas-header">
        <button type="button" className="gx-canvas-switch" aria-haspopup="menu" aria-expanded={Boolean(switcher)} onClick={(event) => setSwitcher(switcher ? null : event.currentTarget)}>
          <span className="gx-canvas-kind"><WorkspaceIcon name={doc.language === "markdown" ? "file" : doc.language === "svg" ? "image" : "code"} size={16} /></span>
          <span className="gx-canvas-title-copy">
            <strong>{doc.title}</strong>
            <small>{doc.language === "markdown" ? "Document" : doc.language.toUpperCase()} · {lineCount} {lineCount === 1 ? "line" : "lines"}{dirty ? " · Edited" : ""}</small>
          </span>
          {docs.length > 1 && <WorkspaceIcon name="chevron-down" size={14} />}
        </button>
        {mode !== "none" && <div className="gx-canvas-tabs" role="tablist" aria-label="Canvas view" data-view={view}>
          <button type="button" role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")}><WorkspaceIcon name="play" size={14} />Preview</button>
          <button type="button" role="tab" aria-selected={view === "code"} onClick={() => { setView("code"); requestAnimationFrame(() => editor.current?.focus({ preventScroll: true })); }}><WorkspaceIcon name="code" size={14} />{doc.language === "markdown" ? "Edit" : "Code"}</button>
        </div>}
        <div className="gx-canvas-actions">
          {mode === "frame" && <WorkspaceTooltip label="Run again" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Run again" onClick={() => setRunId((value) => value + 1)}><WorkspaceIcon name="bolt" size={17} /></button></WorkspaceTooltip>}
          <WorkspaceTooltip label={copied ? "Copied" : "Copy"} side="bottom"><button type="button" className="ws-icon-btn" aria-label="Copy" onClick={copy}><WorkspaceIcon name={copied ? "check" : "copy"} size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label={doc.libraryId ? (unsaved ? "Save changes to Library" : "Saved in Library") : "Save to Library"} side="bottom"><button type="button" className={`ws-icon-btn${unsaved ? " has-dot" : ""}`} aria-label="Save to Library" disabled={saving} onClick={save}><WorkspaceIcon name={doc.libraryId && !unsaved ? "check" : "library"} size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label="More actions" side="bottom"><button type="button" className="ws-icon-btn" aria-label="More actions" aria-haspopup="menu" aria-expanded={Boolean(more)} onClick={(event) => setMore(more ? null : event.currentTarget)}><WorkspaceIcon name="more" size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label={expanded ? "Exit full width" : "Full width"} side="bottom"><button type="button" className="ws-icon-btn gx-canvas-expand" aria-label={expanded ? "Exit full width" : "Full width"} onClick={() => setExpanded(!expanded)}><WorkspaceIcon name={expanded ? "panel" : "external"} size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label="Close canvas" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Close canvas" onClick={() => setOpen(false)}><WorkspaceIcon name="close" size={17} /></button></WorkspaceTooltip>
        </div>
      </header>
      <div className="gx-canvas-body" data-view={view}>
        {view === "preview" && mode === "frame" && <div className="gx-canvas-stage">
          <div className="gx-canvas-frame"><iframe ref={frame} key={`${doc.key}:${runId}`} title={`${doc.title} preview`} sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDoc} /></div>
        </div>}
        {view === "preview" && mode === "markdown" && <article className="gx-canvas-doc" dangerouslySetInnerHTML={{ __html: markdown }} />}
        {view === "code" && <div className="gx-canvas-editor">
          <div ref={gutter} className="gx-canvas-gutter" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
          <textarea
            ref={editor}
            value={doc.content}
            spellCheck={doc.language === "markdown"}
            aria-label={`${doc.title} source`}
            onChange={(event) => update({ content: event.target.value })}
            onScroll={(event) => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; }}
            onKeyDown={(event) => {
              if (event.key !== "Tab" || event.shiftKey) return;
              // Tab indents inside the editor; Shift+Tab still leaves it for keyboard users.
              event.preventDefault();
              const target = event.currentTarget;
              const { selectionStart, selectionEnd, value } = target;
              update({ content: `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}` });
              requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
            }}
          />
        </div>}
        {mode === "frame" && <div className={`gx-canvas-console${consoleOpen ? " is-open" : ""}`}>
          <button type="button" className="gx-canvas-console-toggle" aria-expanded={consoleOpen} onClick={() => setConsoleOpen(!consoleOpen)}>
            <WorkspaceIcon name="chevron" size={13} />Console
            {consoleLines.length > 0 && <span className={`gx-canvas-count${consoleLines.some((line) => line.level === "error") ? " is-error" : ""}`}>{consoleLines.length}</span>}
          </button>
          {consoleOpen && <div className="gx-canvas-log" role="log" aria-live="polite">
            {consoleLines.length ? consoleLines.map((line, index) => <pre key={index} data-level={line.level}>{line.text}</pre>) : <p>Console output from the preview appears here.</p>}
          </div>}
        </div>}
      </div>
    </div>}
    {more && doc && <WorkspaceMenu trigger={more} onClose={() => setMore(null)} className="gx-canvas-menu">
      <button type="button" role="menuitem" onClick={() => { download(); setMore(null); }}><WorkspaceIcon name="download" size={16} /><span>Download .{fileExtension(doc.language)}</span></button>
      <button type="button" role="menuitem" onClick={() => { setView("code"); setMore(null); }}><WorkspaceIcon name="edit" size={16} /><span>Edit source</span></button>
      <button type="button" role="menuitem" disabled={!dirty} onClick={() => { update({ content: doc.original }); setMore(null); }}><WorkspaceIcon name="arrow-left" size={16} /><span>Revert to original</span></button>
    </WorkspaceMenu>}
    {switcher && <WorkspaceMenu trigger={switcher} onClose={() => setSwitcher(null)} className="gx-canvas-menu">
      {docs.map((item) => <button key={item.key} type="button" role="menuitem" aria-current={item.key === currentKey ? "true" : undefined} onClick={() => { setCurrentKey(item.key); setView(previewMode(item.language) === "none" ? "code" : "preview"); setConsoleLines([]); setSwitcher(null); }}>
        <WorkspaceIcon name={item.language === "markdown" ? "file" : "code"} size={16} /><span>{item.title}</span>{item.key === currentKey && <WorkspaceIcon name="check" size={14} />}
      </button>)}
    </WorkspaceMenu>}
  </aside>;
}
