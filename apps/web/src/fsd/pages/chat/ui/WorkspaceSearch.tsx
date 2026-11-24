"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useWorkspace, type WorkspaceConversation } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";
import { useLanguage } from "@/shared/i18n";

type Result = WorkspaceConversation & { snippet?: string; messageId?: number };
type RecallHit = { n: number; messageId: number; conversationId: number; title: string; sender: "user" | "bot"; createdAt: string; snippet: string };
type Ask = { question: string; status: "loading" | "done" | "error"; answer?: string; hits?: RecallHit[]; error?: string };

async function askChats(question: string, signal: AbortSignal) {
  const token = localStorage.getItem("authToken");
  const response = await fetch("/api/chat/recall", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ question }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || "Chat search is unavailable right now.");
  return data as { answer: string; hits: RecallHit[] };
}

const when = (iso: string) => new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });

/** The answer from past chats, with [n] marks that open the message they cite. */
function AskAnswer({ ask, onOpen, onRetry }: { ask: Ask; onOpen: (hit: RecallHit) => void; onRetry: () => void }) {
  if (ask.status === "loading")
    return <div className="gx-ask" aria-live="polite"><div className="gx-ask-head"><WorkspaceIcon name="sparkles" size={15}/><span>Looking through your chats…</span></div><div className="gx-ask-shimmer" aria-hidden="true"><i/><i/><i/></div></div>;
  if (ask.status === "error")
    return <div className="gx-ask" role="alert"><div className="gx-ask-head"><WorkspaceIcon name="sparkles" size={15}/><span>{ask.error}</span></div><button type="button" className="ws-btn" onClick={onRetry}>Try again</button></div>;
  const hits = ask.hits || [];
  const byNumber = new Map(hits.map((hit) => [hit.n, hit]));
  const cited = hits.filter((hit) => (ask.answer || "").includes(`[${hit.n}]`));
  const shown = (cited.length ? cited : hits).slice(0, 4);
  return <div className="gx-ask" aria-live="polite">
    <div className="gx-ask-head"><WorkspaceIcon name="sparkles" size={15}/><span>From your chats</span></div>
    <p className="gx-ask-answer">{(ask.answer || "").split(/(\[\d+\])/g).map((part, index) => {
      const hit = /^\[(\d+)\]$/.test(part) ? byNumber.get(Number(part.slice(1, -1))) : undefined;
      return hit ? <button key={index} type="button" className="gx-ask-cite" title={`${hit.title} · ${when(hit.createdAt)}`} onClick={() => onOpen(hit)}>{hit.n}</button> : <span key={index}>{part}</span>;
    })}</p>
    {shown.length > 0 && <ul className="gx-ask-hits">{shown.map((hit) => <li key={hit.messageId}><button type="button" onClick={() => onOpen(hit)}>
      <span className="gx-ask-n">{hit.n}</span>
      <span className="gx-ask-copy"><strong>{hit.title}</strong><small>{when(hit.createdAt)} · {hit.sender === "user" ? "You" : "Assistant"}</small><span>{hit.snippet}</span></span>
    </button></li>)}</ul>}
  </div>;
}
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
  const [ask, setAsk] = useState<Ask | null>(null);
  const askAbort = useRef<AbortController | null>(null);
  const askable = query.trim().length >= 3;
  const runAsk = (question = query.trim()) => {
    askAbort.current?.abort();
    const abort = new AbortController();
    askAbort.current = abort;
    setAsk({ question, status: "loading" });
    askChats(question, abort.signal)
      .then((data) => { if (!abort.signal.aborted) setAsk({ question, status: "done", answer: data.answer, hits: data.hits }); })
      .catch((caught) => { if (!abort.signal.aborted) setAsk({ question, status: "error", error: caught.message }); });
  };
  useEffect(() => () => askAbort.current?.abort(), []);
  const openHit = (hit: RecallHit) => {
    onClose();
    selectChat(hit.conversationId);
    document.dispatchEvent(new CustomEvent("genyxo:focus-message", { detail: { id: hit.messageId } }));
  };
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const updateQuery = (value: string) => { setQuery(value); setActive(0); setBusy(Boolean(value.trim())); setError(""); if (ask && value.trim() !== ask.question) { askAbort.current?.abort(); setAsk(null); } };
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
  // With a query the first row asks the question across all chats.
  const lead = hasNew || askable ? 1 : 0;
  const count = results.length + lead;
  const choose = (index: number) => {
    if (hasNew && index === 0) { onClose(); startNewChat(); return; }
    if (askable && index === 0) { runAsk(); return; }
    const result = results[index - lead];
    if (!result) return;
    onClose();
    selectChat(result.id);
    if (result.messageId) document.dispatchEvent(new CustomEvent("genyxo:focus-message", { detail: { id: result.messageId } }));
  };
  return <WorkspaceDialog title={t("workspace.search_chats", "Search chats")} onClose={onClose} wide className="ws-search-dialog">
    <div className="ws-search-input"><WorkspaceIcon name="search"/><input ref={input} autoFocus role="combobox" aria-expanded="true" aria-controls={listId} aria-activedescendant={count ? `${listId}-${active}` : undefined} aria-autocomplete="list" aria-label={t("workspace.search_chats", "Search chats")} placeholder={t("workspace.search_placeholder", "Search titles and messages…")} value={query} onChange={(e) => updateQuery(e.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} onKeyDown={(event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const next = (active + (event.key === "ArrowDown" ? 1 : -1) + Math.max(1, count)) % Math.max(1, count); setActive(next); document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" }); }
      if (event.key === "Enter" && !busy) { event.preventDefault(); choose(active); }
    }}/>{query && <WorkspaceTooltip label={t("workspace.clear_search", "Clear search")} side="bottom"><button className="ws-icon-btn" aria-label={t("workspace.clear_search", "Clear search")} onClick={() => { updateQuery(""); input.current?.focus(); }}><WorkspaceIcon name="close" size={17}/></button></WorkspaceTooltip>}</div>
    <div className="ws-search-results" role="listbox" id={listId} aria-label={t("workspace.search_results", "Search results")} aria-busy={busy}>
      {askable && <button type="button" role="option" id={`${listId}-0`} aria-selected={active === 0} className={`ws-search-result gx-ask-row${active === 0 ? " is-active" : ""}`} onMouseEnter={() => setActive(0)} onClick={() => choose(0)}><WorkspaceIcon name="sparkles"/><span><strong>Ask your chats</strong><small>“{query.trim()}”</small></span><kbd>↵</kbd></button>}
      {ask && <AskAnswer ask={ask} onOpen={openHit} onRetry={() => runAsk(ask.question)}/>}
      {hasNew && <button type="button" role="option" id={`${listId}-0`} aria-selected={active === 0} className={`ws-search-result${active === 0 ? " is-active" : ""}`} onMouseEnter={() => setActive(0)} onClick={() => choose(0)}><WorkspaceIcon name="new"/><span>{t("workspace.new_chat", "New chat")}</span><kbd>Ctrl ⇧ O</kbd></button>}
      {busy ? <div className="ws-search-skeleton" aria-hidden="true">{[0,1,2].map((n) => <div className="ws-skeleton" key={n}/>)}</div> : error ? <div className="ws-inline-error" role="alert">{error}<button className="ws-btn" onClick={() => setRetry((n) => n + 1)}>{t("workspace.retry", "Retry")}</button></div> : results.map((result, n) => {
        const index = n + lead, project = projects.find((item) => item.id === result.projectId);
        return <button key={result.id} type="button" role="option" id={`${listId}-${index}`} aria-selected={active === index} className={`ws-search-result${active === index ? " is-active" : ""}`} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}><WorkspaceIcon name={result.archivedAt ? "archive" : "new"}/><span><strong><Match text={result.title} query={query}/></strong>{result.snippet && <small><Match text={result.snippet} query={query}/></small>}{project && <small>{project.name}</small>}</span></button>;
      })}
      {!busy && !error && !results.length && query && !ask && <div className="ws-empty">{t("workspace.no_results", "No matching chats")}</div>}
    </div>
    <div className="ws-palette-footer"><span><kbd>↑↓</kbd> {t("workspace.choose", "Choose")}</span><span><kbd>↵</kbd> {t("workspace.open", "Open")}</span><span><kbd>esc</kbd> {t("workspace.close", "Close")}</span></div>
  </WorkspaceDialog>;
}
