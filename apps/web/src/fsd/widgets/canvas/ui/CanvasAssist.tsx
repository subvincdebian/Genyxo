"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import type { DiffPart, Version } from "../model/versions";

export type Selection = { start: number; end: number; top: number; left: number };

const DOC_ACTIONS = [
  { label: "Rewrite", instruction: "Rewrite this to read better, keeping the meaning." },
  { label: "Shorter", instruction: "Make this shorter and tighter, keeping the key points." },
  { label: "Longer", instruction: "Expand this with more detail and examples." },
  { label: "Simpler", instruction: "Rewrite this in simpler, clearer language." },
  { label: "Fix", instruction: "Fix spelling, grammar and punctuation without changing the meaning." },
];
const CODE_ACTIONS = [
  { label: "Fix bugs", instruction: "Find and fix bugs in this code. Keep its behavior otherwise." },
  { label: "Comments", instruction: "Add brief, useful comments to this code." },
  { label: "Optimize", instruction: "Make this code faster and cleaner without changing what it does." },
  { label: "Refactor", instruction: "Refactor this code for readability, keeping behavior identical." },
];

const Sparkle = ({ size = 15 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <path d="M12 2.8c.5 4.4 2.8 6.7 7.2 7.2-4.4.5-6.7 2.8-7.2 7.2-.5-4.4-2.8-6.7-7.2-7.2 4.4-.5 6.7-2.8 7.2-7.2Z" />
    <path d="M18.6 15.6c.2 1.7 1.1 2.6 2.8 2.8-1.7.2-2.6 1.1-2.8 2.8-.2-1.7-1.1-2.6-2.8-2.8 1.7-.2 2.6-1.1 2.8-2.8Z" opacity=".55" />
  </svg>
);

/** The glass bar that appears over a selection: quick edits or a custom ask. */
export function SelectionBar({ selection, code, onRun }: { selection: Selection; code: boolean; onRun: (instruction: string) => void }) {
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (asking) input.current?.focus({ preventScroll: true });
  }, [asking]);
  const actions = code ? CODE_ACTIONS : DOC_ACTIONS;
  return (
    <div
      className="gx-cv-bar"
      role="toolbar"
      aria-label="Edit the selection with AI"
      style={{ "--top": `${selection.top}px`, "--left": `${selection.left}px` } as CSSProperties}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).tagName !== "INPUT") event.preventDefault();
      }}
    >
      {asking ? (
        <form
          className="gx-cv-bar-ask"
          onSubmit={(event) => {
            event.preventDefault();
            if (text.trim()) onRun(text.trim());
          }}
        >
          <Sparkle />
          <input ref={input} value={text} onChange={(event) => setText(event.target.value)} placeholder="Tell AI what to change…" aria-label="What to change" onKeyDown={(event) => event.key === "Escape" && setAsking(false)} />
          <button type="submit" className="gx-cv-send" disabled={!text.trim()} aria-label="Apply">
            <WorkspaceIcon name="arrow" size={15} />
          </button>
        </form>
      ) : (
        <>
          <button type="button" className="gx-cv-bar-main" onClick={() => setAsking(true)}>
            <Sparkle />
            Ask AI
          </button>
          <span className="gx-cv-bar-sep" aria-hidden="true" />
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={() => onRun(action.instruction)}>
              {action.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** The ask field at the bottom of the canvas, and the state of the last edit. */
export function AssistBar({
  code,
  selectionSize,
  running,
  status,
  lastEdit,
  onRun,
  onStop,
  onClearSelection,
  onUndo,
  onCompare,
}: {
  code: boolean;
  selectionSize: number;
  running: boolean;
  status: string;
  lastEdit: boolean;
  onRun: (instruction: string) => void;
  onStop: () => void;
  onClearSelection: () => void;
  onUndo: () => void;
  onCompare: () => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="gx-cv-assist">
      {(running || lastEdit) && (
        <div className="gx-cv-status" data-running={running || undefined} aria-live="polite">
          {running ? (
            <>
              <span className="gx-cv-pulse" aria-hidden="true" />
              <span className="gx-cv-shimmer">{status}</span>
            </>
          ) : (
            <>
              <WorkspaceIcon name="check" size={14} />
              <span>Edited by AI</span>
              <button type="button" onClick={onUndo}>Undo</button>
              <button type="button" onClick={onCompare}>Compare</button>
            </>
          )}
        </div>
      )}
      <form
        className="gx-cv-ask"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim() || running) return;
          onRun(text.trim());
          setText("");
        }}
      >
        <Sparkle size={16} />
        {selectionSize > 0 && (
          <button type="button" className="gx-cv-chip" title="Edit the whole document instead" onClick={onClearSelection}>
            Selection · {selectionSize} chars
            <WorkspaceIcon name="close" size={12} />
          </button>
        )}
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={selectionSize ? "Edit the selection…" : code ? "Ask AI to change this code…" : "Ask AI to edit this document…"}
          aria-label="Ask AI to edit"
          disabled={running}
        />
        {running ? (
          <button type="button" className="gx-cv-send" aria-label="Stop" onClick={onStop}>
            <span className="gx-cv-stop" />
          </button>
        ) : (
          <button type="submit" className="gx-cv-send" aria-label="Apply" disabled={!text.trim()}>
            <WorkspaceIcon name="arrow" size={15} />
          </button>
        )}
      </form>
    </div>
  );
}

const KIND_LABEL: Record<Version["kind"], string> = { original: "Original", ai: "AI edit", edit: "Your edits", saved: "Saved", restore: "Restored" };

function ago(at: number) {
  const minutes = Math.round((Date.now() - at) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} h ago`;
  return new Date(at).toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** Version history: newest first, each with what changed. */
export function HistoryList({
  versions,
  current,
  sizes,
  onCompare,
}: {
  versions: Version[];
  current: string;
  sizes: Map<string, { added: number; removed: number }>;
  onCompare: (version: Version) => void;
}) {
  const list = [...versions].reverse();
  return (
    <div className="gx-cv-history" role="dialog" aria-label="Version history">
      <p className="gx-cv-history-title">Version history</p>
      <ol>
        {list.map((version) => {
          const size = sizes.get(version.id);
          const isCurrent = version.content === current;
          return (
            <li key={version.id}>
              <button type="button" onClick={() => onCompare(version)} aria-current={isCurrent || undefined}>
                <span className="gx-cv-history-dot" data-kind={version.kind} aria-hidden="true" />
                <span className="gx-cv-history-copy">
                  <strong>{version.kind === "ai" ? version.label : KIND_LABEL[version.kind]}</strong>
                  <small>
                    {version.kind === "ai" ? "AI edit · " : ""}
                    {ago(version.at)}
                    {size && (size.added || size.removed) ? ` · +${size.added} −${size.removed}` : ""}
                    {isCurrent ? " · Current" : ""}
                  </small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A version compared word by word with the document now (parts: version → now). */
export function CompareView({
  version,
  parts,
  onRestore,
  onClose,
}: {
  version: Version;
  parts: DiffPart[];
  onRestore: () => void;
  onClose: () => void;
}) {
  const added = parts.filter((part) => part.type === "added").length;
  const removed = parts.filter((part) => part.type === "removed").length;
  return (
    <div className="gx-cv-compare">
      <div className="gx-cv-compare-head">
        <span>
          <strong>{version.kind === "ai" ? version.label : KIND_LABEL[version.kind]}</strong>
          <small>
            {ago(version.at)} · compared with now · {added + removed ? `${added} additions, ${removed} removals` : "no differences"}
          </small>
        </span>
        <button type="button" className="ws-btn" onClick={onClose}>Close</button>
        <button type="button" className="ws-btn ws-btn-primary" onClick={onRestore}>Restore this version</button>
      </div>
      <div className="gx-cv-diff" aria-label="Changes">
        {parts.map((part, index) =>
          part.type === "same" ? (
            <span key={index}>{part.text}</span>
          ) : part.type === "added" ? (
            <ins key={index} title="Added since this version">{part.text}</ins>
          ) : (
            <del key={index} title="Removed since this version">{part.text}</del>
          ),
        )}
      </div>
    </div>
  );
}
