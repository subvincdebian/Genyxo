"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { workspaceRequest } from "@/features/workspace";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { buildPreviewDocument, fileExtension, normalizeLanguage, previewMode, suggestTitle } from "../model/preview";
import { changeSize, diff, loadStored, locate, newVersion, pushVersion, saveStored, type Version } from "../model/versions";
import { exportDocument, streamEdit } from "../model/ai";
import { AssistBar, CompareView, HistoryList, SelectionBar, type Selection } from "./CanvasAssist";
import "./canvas.css";

export type CanvasOpenDetail = { title?: string; language?: string; content: string };
type CanvasDoc = { key: string; title: string; language: string; original: string; content: string; libraryId?: number; savedContent?: string; versions: Version[] };
type ConsoleLine = { level: string; text: string };

const WIDTH_KEY = "genyxo:canvas-width";
const MAX_DOCS = 8;
const LINE_HEIGHT = 12.5 * 1.65;
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
  const [history, setHistory] = useState<HTMLElement | null>(null);
  const [compare, setCompare] = useState<Version | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [lastEdit, setLastEdit] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const article = useRef<HTMLElement>(null);
  const abort = useRef<AbortController | null>(null);
  const loaded = useRef(false);
  const doc = docs.find((item) => item.key === currentKey) || null;
  const mode = doc ? previewMode(doc.language) : "none";
  const code = Boolean(doc && doc.language !== "markdown");

  const notify = (message: string, type = "success") => document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));

  useEffect(() => {
    try { const stored = Number(localStorage.getItem(WIDTH_KEY)); if (stored >= 360) queueMicrotask(() => setWidth(stored)); } catch { /* Width preference is optional. */ }
    // Documents and their history survive a reload.
    const stored = loadStored<CanvasDoc>().filter((item) => item && typeof item.content === "string");
    if (stored.length) queueMicrotask(() => setDocs(stored.map((item) => ({ ...item, versions: item.versions || [newVersion(item.original, "Original", "original")] }))));
    queueMicrotask(() => { loaded.current = true; });
    const openEvent = (event: Event) => {
      const detail = (event as CustomEvent<CanvasOpenDetail>).detail;
      if (!detail?.content) return;
      const language = normalizeLanguage(detail.language || "markdown");
      const key = docKey(language, detail.content);
      setDocs((items) => items.some((item) => item.key === key) ? items : [{ key, language, title: detail.title || suggestTitle(language, detail.content), original: detail.content, content: detail.content, versions: [newVersion(detail.content, "Original", "original")] }, ...items].slice(0, MAX_DOCS));
      setCurrentKey(key);
      setView(previewMode(language) === "none" ? "code" : "preview");
      setConsoleLines([]);
      setCompare(null);
      setSelection(null);
      setLastEdit(false);
      setOpen(true);
    };
    const close = () => setOpen(false);
    document.addEventListener("genyxo:canvas-open", openEvent);
    document.addEventListener("genyxo:workspace-new", close);
    return () => { document.removeEventListener("genyxo:canvas-open", openEvent); document.removeEventListener("genyxo:workspace-new", close); };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const timer = setTimeout(() => saveStored(docs), 700);
    return () => clearTimeout(timer);
  }, [docs]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-canvas-open", open && active);
    return () => document.documentElement.removeAttribute("data-canvas-open");
  }, [open, active]);

  // Rebuild the preview shortly after typing stops, so edits feel live but stay cheap.
  useEffect(() => {
    if (!doc || mode !== "frame" || running) return;
    const timer = setTimeout(() => { setConsoleLines([]); setPreviewDoc(buildPreviewDocument(doc.language, doc.content)); }, 350);
    return () => clearTimeout(timer);
  }, [doc, mode, runId, running]);

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
  const sizes = useMemo(() => {
    const map = new Map<string, { added: number; removed: number }>();
    if (!history || !doc) return map;
    doc.versions.forEach((version, index) => { if (index) map.set(version.id, changeSize(doc.versions[index - 1].content, version.content)); });
    return map;
  }, [history, doc]);
  const compareParts = useMemo(() => (compare && doc ? diff(compare.content, doc.content) : []), [compare, doc]);

  const update = useCallback((patch: Partial<CanvasDoc>) => setDocs((items) => items.map((item) => item.key === currentKey ? { ...item, ...patch } : item)), [currentKey]);
  const addVersion = useCallback((content: string, label: string, kind: Version["kind"]) => setDocs((items) => items.map((item) => item.key === currentKey ? { ...item, versions: pushVersion(item.versions, newVersion(content, label, kind)) } : item)), [currentKey]);

  // ——— Selections: in the code editor and in the rendered document ———
  const readEditorSelection = () => {
    const target = editor.current;
    if (!target || running) return;
    const { selectionStart: start, selectionEnd: end, value } = target;
    if (end - start < 2) { setSelection(null); return; }
    const first = value.slice(0, start).split("\n").length - 1;
    const last = value.slice(0, end).split("\n").length - 1;
    const above = 16 + first * LINE_HEIGHT - target.scrollTop - 46;
    // No room above the selection: the bar sits just under it instead.
    const top = above >= 8 ? above : Math.min(16 + (last + 1) * LINE_HEIGHT - target.scrollTop + 8, target.clientHeight - 48);
    setSelection({ start, end, top, left: 56 });
  };
  const readPreviewSelection = () => {
    if (!doc || running) return;
    const picked = window.getSelection();
    const text = picked?.toString() || "";
    if (!picked || picked.isCollapsed || text.trim().length < 2 || !article.current?.contains(picked.anchorNode)) { setSelection(null); return; }
    const range = locate(doc.content, text);
    if (!range) { setSelection(null); return; }
    const box = picked.getRangeAt(0).getBoundingClientRect();
    const frameBox = body.current!.getBoundingClientRect();
    const above = box.top - frameBox.top - 48;
    const top = above >= 8 ? above : Math.min(box.bottom - frameBox.top + 8, frameBox.height - 120);
    setSelection({ ...range, top, left: Math.min(Math.max(12, box.left - frameBox.left), frameBox.width - 380) });
  };
  useEffect(() => { queueMicrotask(() => setSelection(null)); }, [currentKey, view]);

  // ——— AI edits ———
  const runEdit = async (instruction: string) => {
    if (!doc || running) return;
    const before = doc.content;
    const range = selection && selection.end <= before.length ? { start: selection.start, end: selection.end } : undefined;
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setLastEdit(false);
    setCompare(null);
    setSelection(null);
    setStatus(range ? "Rewriting the selection…" : code ? "Updating the code…" : "Editing the document…");
    if (doc.versions[doc.versions.length - 1]?.content !== before) addVersion(before, "Your edits", "edit");
    const apply = (text: string) => update({ content: range ? before.slice(0, range.start) + text + before.slice(range.end) : text });
    try {
      const result = await streamEdit({ content: before, language: doc.language, instruction, selection: range }, apply, controller.signal);
      const finalText = range ? before.slice(0, range.start) + result.text + before.slice(range.end) : result.text;
      update({ content: finalText });
      addVersion(finalText, instruction.length > 80 ? `${instruction.slice(0, 77)}…` : instruction, "ai");
      setLastEdit(true);
      if (typeof result.creditBalance === "number") document.dispatchEvent(new CustomEvent("genyxo:balance", { detail: result.creditBalance }));
    } catch (error) {
      update({ content: before });
      if (!controller.signal.aborted) notify((error as Error).message || "The edit failed", "error");
    } finally {
      setRunning(false);
      abort.current = null;
    }
  };
  const undoEdit = () => {
    if (!doc || doc.versions.length < 2) return;
    const previous = doc.versions[doc.versions.length - 2];
    update({ content: previous.content });
    addVersion(previous.content, "Undid the AI edit", "restore");
    setLastEdit(false);
  };
  const restore = (version: Version) => {
    if (!doc) return;
    if (doc.versions[doc.versions.length - 1]?.content !== doc.content) addVersion(doc.content, "Your edits", "edit");
    update({ content: version.content });
    addVersion(version.content, `Restored ${version.kind === "ai" ? `“${version.label}”` : "a version"}`, "restore");
    setCompare(null);
    notify("Version restored");
  };

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
  const exportAs = async (format: "docx" | "pdf" | "pptx") => {
    if (!doc || exporting) return;
    setMore(null);
    setExporting(format);
    try {
      await exportDocument(format, doc);
      notify(`Exported as ${format === "docx" ? "Word" : format === "pptx" ? "PowerPoint" : "PDF"}`);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setExporting(null);
    }
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
      addVersion(doc.content, "Saved to Library", "saved");
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
    onKeyDown={(event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Escape in a menu or popover closes only that, never the canvas.
      if ((event.target as HTMLElement).closest?.('[role="menu"], [role="dialog"], .gx-canvas-menu')) return;
      event.stopPropagation();
      if (history || more || switcher) { setHistory(null); setMore(null); setSwitcher(null); return; }
      if (running) abort.current?.abort();
      else if (selection) setSelection(null);
      else if (compare) setCompare(null);
      else if (expanded) setExpanded(false);
      else setOpen(false);
    }}
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
          <WorkspaceTooltip label="Version history" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Version history" aria-haspopup="dialog" aria-expanded={Boolean(history)} onClick={(event) => setHistory(history ? null : event.currentTarget)}><WorkspaceIcon name="clock" size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label="Export and more" side="bottom"><button type="button" className={`ws-icon-btn${unsaved ? " has-dot" : ""}`} aria-label="Export and more" aria-haspopup="menu" aria-expanded={Boolean(more)} onClick={(event) => setMore(more ? null : event.currentTarget)}>{exporting ? <span className="gx-cv-spinner" /> : <WorkspaceIcon name="more" size={17} />}</button></WorkspaceTooltip>
          <WorkspaceTooltip label={expanded ? "Exit full width" : "Full width"} side="bottom"><button type="button" className="ws-icon-btn gx-canvas-expand" aria-label={expanded ? "Exit full width" : "Full width"} onClick={() => setExpanded(!expanded)}><WorkspaceIcon name={expanded ? "panel" : "external"} size={17} /></button></WorkspaceTooltip>
          <WorkspaceTooltip label="Close canvas" side="bottom"><button type="button" className="ws-icon-btn" aria-label="Close canvas" onClick={() => setOpen(false)}><WorkspaceIcon name="close" size={17} /></button></WorkspaceTooltip>
        </div>
      </header>
      <div ref={body} className="gx-canvas-body" data-view={view} data-running={running || undefined}>
        {compare ? <CompareView version={compare} parts={compareParts} onRestore={() => restore(compare)} onClose={() => setCompare(null)} /> : <>
          {view === "preview" && mode === "frame" && <div className="gx-canvas-stage">
            <div className="gx-canvas-frame"><iframe ref={frame} key={`${doc.key}:${runId}`} title={`${doc.title} preview`} sandbox="allow-scripts allow-forms allow-modals" srcDoc={previewDoc} /></div>
          </div>}
          {view === "preview" && mode === "markdown" && <article ref={article} className="gx-canvas-doc" onMouseUp={() => requestAnimationFrame(readPreviewSelection)} onKeyUp={readPreviewSelection} dangerouslySetInnerHTML={{ __html: markdown }} />}
          {view === "code" && <div className="gx-canvas-editor">
            <div ref={gutter} className="gx-canvas-gutter" aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}</div>
            <textarea
              ref={editor}
              value={doc.content}
              readOnly={running}
              spellCheck={doc.language === "markdown"}
              aria-label={`${doc.title} source`}
              onChange={(event) => update({ content: event.target.value })}
              onSelect={readEditorSelection}
              onMouseUp={readEditorSelection}
              onKeyUp={readEditorSelection}
              onScroll={(event) => { if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop; if (selection) readEditorSelection(); }}
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
          {selection && !running && <SelectionBar key={`${selection.start}:${selection.end}`} selection={selection} code={code} onRun={runEdit} />}
        </>}
        {mode === "frame" && !compare && <div className={`gx-canvas-console${consoleOpen ? " is-open" : ""}`}>
          <button type="button" className="gx-canvas-console-toggle" aria-expanded={consoleOpen} onClick={() => setConsoleOpen(!consoleOpen)}>
            <WorkspaceIcon name="chevron" size={13} />Console
            {consoleLines.length > 0 && <span className={`gx-canvas-count${consoleLines.some((line) => line.level === "error") ? " is-error" : ""}`}>{consoleLines.length}</span>}
          </button>
          {consoleOpen && <div className="gx-canvas-log" role="log" aria-live="polite">
            {consoleLines.length ? consoleLines.map((line, index) => <pre key={index} data-level={line.level}>{line.text}</pre>) : <p>Console output from the preview appears here.</p>}
          </div>}
        </div>}
        {!compare && <AssistBar
          code={code}
          selectionSize={selection ? selection.end - selection.start : 0}
          running={running}
          status={status}
          lastEdit={lastEdit}
          onRun={runEdit}
          onStop={() => abort.current?.abort()}
          onClearSelection={() => setSelection(null)}
          onUndo={undoEdit}
          onCompare={() => { const previous = doc.versions[doc.versions.length - 2]; if (previous) setCompare(previous); }}
        />}
      </div>
    </div>}
    {history && doc && <WorkspaceMenu trigger={history} onClose={() => setHistory(null)} className="gx-canvas-menu gx-cv-history-menu">
      <HistoryList versions={doc.versions} current={doc.content} sizes={sizes} onCompare={(version) => { setCompare(version); setHistory(null); }} />
    </WorkspaceMenu>}
    {more && doc && <WorkspaceMenu trigger={more} onClose={() => setMore(null)} className="gx-canvas-menu">
      <button type="button" role="menuitem" onClick={() => { void copy(); setMore(null); }}><WorkspaceIcon name={copied ? "check" : "copy"} size={16} /><span>Copy</span></button>
      <button type="button" role="menuitem" disabled={saving} onClick={() => { void save(); setMore(null); }}><WorkspaceIcon name="library" size={16} /><span>{doc.libraryId ? (unsaved ? "Save changes to Library" : "Saved in Library") : "Save to Library"}</span></button>
      <div className="gx-canvas-menu-sep" role="separator" />
      {doc.language === "markdown" && <button type="button" role="menuitem" onClick={() => void exportAs("docx")}><WorkspaceIcon name="file" size={16} /><span>Export as Word</span><small>.docx</small></button>}
      <button type="button" role="menuitem" onClick={() => void exportAs("pdf")}><WorkspaceIcon name="file" size={16} /><span>Export as PDF</span><small>.pdf</small></button>
      {doc.language === "markdown" && <button type="button" role="menuitem" onClick={() => void exportAs("pptx")}><WorkspaceIcon name="grid" size={16} /><span>Export as slides</span><small>.pptx</small></button>}
      <button type="button" role="menuitem" onClick={() => { download(); setMore(null); }}><WorkspaceIcon name="download" size={16} /><span>Download source</span><small>.{fileExtension(doc.language)}</small></button>
      <div className="gx-canvas-menu-sep" role="separator" />
      <button type="button" role="menuitem" onClick={() => { setView("code"); setMore(null); }}><WorkspaceIcon name="edit" size={16} /><span>Edit source</span></button>
      <button type="button" role="menuitem" disabled={!dirty} onClick={() => { restore(doc.versions[0]); setMore(null); }}><WorkspaceIcon name="arrow-left" size={16} /><span>Revert to original</span></button>
    </WorkspaceMenu>}
    {switcher && <WorkspaceMenu trigger={switcher} onClose={() => setSwitcher(null)} className="gx-canvas-menu">
      {docs.map((item) => <button key={item.key} type="button" role="menuitem" aria-current={item.key === currentKey ? "true" : undefined} onClick={() => { setCurrentKey(item.key); setView(previewMode(item.language) === "none" ? "code" : "preview"); setConsoleLines([]); setCompare(null); setLastEdit(false); setSwitcher(null); }}>
        <WorkspaceIcon name={item.language === "markdown" ? "file" : "code"} size={16} /><span>{item.title}</span>{item.key === currentKey && <WorkspaceIcon name="check" size={14} />}
      </button>)}
    </WorkspaceMenu>}
  </aside>;
}
