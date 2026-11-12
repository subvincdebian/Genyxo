"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useWorkspace, type WorkspaceConversation } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";
import { useLanguage } from "@/shared/i18n";

type Result = WorkspaceConversation & { snippet?: string; messageId?: number };
function Match({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts: ReactNode[] = [];
  const source = text.toLocaleLowerCase(), term = query.trim().toLocaleLowerCase();
  let from = 0, index = source.indexOf(term);
  while (index !== -1) { parts.push(text.slice(from, index), <mark key={index}>{text.slice(index, index + term.length)}</mark>); from = index + term.length; index = source.indexOf(term, from); }
  parts.push(text.slice(from)); return <>{parts}</>;
}
export function WorkspaceSearch({ onClose }: { onClose: () => void }) {
  const { conversations, projects, request, selectChat, startNewChat } = useWorkspace();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [fetchedResults, setResults] = useState<Result[]>([]);
  const results: Result[] = query.trim() ? fetchedResults : conversations.filter((item) => !item.archivedAt).slice(0, 20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);
  const [composing, setComposing] = useState(false);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const updateQuery = (value: string) => { setQuery(value); setActive(0); setBusy(Boolean(value.trim())); setError(""); };
  useEffect(() => {
    if (!query.trim()) return;
    if (composing) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true); setError("");
      request<{ items: Result[] }>(`conversations?search=${encodeURIComponent(query.trim())}&limit=50&archived=all`, { signal: abort.signal })
        .then((data) => { if (!abort.signal.aborted) { setResults(data.items || []); setActive(0); } })
        .catch((caught) => { if (!abort.signal.aborted) setError(caught.message); })
        .finally(() => { if (!abort.signal.aborted) setBusy(false); });
    }, 300);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [query, composing, request, retry]);
  const hasNew = !query.trim();
  const count = results.length + (hasNew ? 1 : 0);
  const choose = (index: number) => {
    if (hasNew && index === 0) { onClose(); startNewChat(); return; }
    const result = results[index - (hasNew ? 1 : 0)];
    if (result) { onClose(); selectChat(result.id); }
  };
  return <WorkspaceDialog title={t("workspace.search_chats", "Search chats")} onClose={onClose} wide className="ws-search-dialog">
    <div className="ws-search-input"><WorkspaceIcon name="search"/><input ref={input} autoFocus role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={count ? `${listId}-${active}` : undefined} aria-autocomplete="list" aria-label={t("workspace.search_chats", "Search chats")} placeholder={t("workspace.search_placeholder", "Search titles and messages…")} value={query} onChange={(e) => updateQuery(e.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={(event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = (active + (event.key === "ArrowDown" ? 1 : -1) + Math.max(1, count)) % Math.max(1, count); setActive(next); document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" }); }
      if (event.key === "Enter" && !busy) { event.preventDefault(); choose(active); }
    }}/>{query && <WorkspaceTooltip label={t("workspace.clear_search", "Clear search")} side="bottom"><button className="ws-icon-btn" aria-label={t("workspace.clear_search", "Clear search")} onClick={() => { updateQuery(""); input.current?.focus(); }}><WorkspaceIcon name="close" size={17}/></button></WorkspaceTooltip>}</div>
    <div className="ws-search-results" role="listbox" id={listId} aria-label={t("workspace.search_results", "Search results")} aria-busy={busy}>
      {hasNew && <button type="button" role="option" id={`${listId}-0`} aria-selected={active === 0} className={`ws-search-result${active === 0 ? " is-active" : ""}`} onMouseEnter={() => setActive(0)} onClick={() => choose(0)}><WorkspaceIcon name="new"/><span>{t("workspace.new_chat", "New chat")}</span><kbd>Ctrl ⇧ O</kbd></button>}
      {busy ? <div className="ws-search-skeleton" aria-hidden="true">{[0,1,2].map((n) => <div className="ws-skeleton" key={n}/>)}</div> : error ? <div className="ws-inline-error" role="alert">{error}<button className="ws-btn" onClick={() => setRetry((n) => n + 1)}>{t("workspace.retry", "Retry")}</button></div> : results.map((result, n) => {
        const index = n + (hasNew ? 1 : 0), project = projects.find((item) => item.id === result.projectId);
        return <button key={result.id} type="button" role="option" id={`${listId}-${index}`} aria-selected={active === index} className={`ws-search-result${active === index ? " is-active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}><WorkspaceIcon name={result.archivedAt ? "archive" : "new"}/><span><strong><Match text={result.title} query={query}/></strong>{result.snippet && <small><Match text={result.snippet} query={query}/></small>}{project && <small>{project.name}</small>}</span></button>;
      })}
      {!busy && !error && !results.length && query && <div className="ws-empty">{t("workspace.no_results", "No matching chats")}</div>}
    </div>
    <div className="ws-palette-footer"><span><kbd>↑↓</kbd> {t("workspace.choose", "Choose")}</span><span><kbd>↵</kbd> {t("workspace.open", "Open")}</span><span><kbd>esc</kbd> {t("workspace.close", "Close")}</span></div>
  </WorkspaceDialog>;
}
