"use client";
import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace, type WorkspaceConversation } from "@/features/workspace";
import { WorkspaceIcon, lockWorkspaceScroll } from "@/shared/ui/workspace";
import { Keys } from "@/shared/ui/Keys";
import { getInteractions, getServerInteractions, subscribeInteractions } from "@/shared/lib/interaction-settings";
import { COMMANDS, SETTING_PAGES, matchScore, modelIcon, type CommandId } from "../model/commands";
import styles from "./CommandPalette.module.css";

type Result = WorkspaceConversation & { snippet?: string; messageId?: number };
type RecallHit = { n: number; messageId: number; conversationId: number; title: string; sender: "user" | "bot"; createdAt: string; snippet: string };
type Ask = { question: string; status: "loading" | "done" | "error"; answer?: string; hits?: RecallHit[]; error?: string };
type Scope = "models" | "skills" | "projects" | "settings";
type Row = {
  key: string;
  group: string;
  title: ReactNode;
  label: string;
  hint?: ReactNode;
  icon?: string;
  image?: string;
  binding?: string;
  current?: boolean;
  opens?: boolean;
  run: () => void;
};

const SCOPES: Record<Scope, { title: string; placeholder: string; icon: string }> = {
  models: { title: "Models", placeholder: "Find a model…", icon: "cube" },
  skills: { title: "Skills", placeholder: "Find a skill…", icon: "sparkles" },
  projects: { title: "Projects", placeholder: "Find a project…", icon: "folder" },
  settings: { title: "Settings", placeholder: "Find a setting…", icon: "settings" },
};

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

function Match({ text, query }: { text: string; query: string }) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return <>{text}</>;
  const parts: ReactNode[] = [];
  const source = text.toLocaleLowerCase();
  let from = 0;
  let index = source.indexOf(term);
  while (index !== -1) {
    parts.push(text.slice(from, index), <mark key={index}>{text.slice(index, index + term.length)}</mark>);
    from = index + term.length;
    index = source.indexOf(term, from);
  }
  parts.push(text.slice(from));
  return <>{parts}</>;
}

/** The answer from past chats, with [n] marks that open the message they cite. */
function AskAnswer({ ask, onOpen, onRetry }: { ask: Ask; onOpen: (hit: RecallHit) => void; onRetry: () => void }) {
  if (ask.status === "loading")
    return <div className={styles.ask} aria-live="polite"><div className={styles.askHead}><WorkspaceIcon name="sparkles" size={15} /><span>Looking through your chats…</span></div><div className={styles.shimmer} aria-hidden="true"><i /><i /><i /></div></div>;
  if (ask.status === "error")
    return <div className={styles.ask} role="alert"><div className={styles.askHead}><WorkspaceIcon name="sparkles" size={15} /><span>{ask.error}</span></div><button type="button" className={styles.askRetry} onClick={onRetry}>Try again</button></div>;
  const hits = ask.hits || [];
  const byNumber = new Map(hits.map((hit) => [hit.n, hit]));
  const cited = hits.filter((hit) => (ask.answer || "").includes(`[${hit.n}]`));
  const shown = (cited.length ? cited : hits).slice(0, 4);
  return <div className={styles.ask} aria-live="polite">
    <div className={styles.askHead}><WorkspaceIcon name="sparkles" size={15} /><span>From your chats</span></div>
    <p className={styles.askAnswer}>{(ask.answer || "").split(/(\[\d+\])/g).map((part, index) => {
      const hit = /^\[(\d+)\]$/.test(part) ? byNumber.get(Number(part.slice(1, -1))) : undefined;
      return hit ? <button key={index} type="button" className={styles.cite} title={`${hit.title} · ${when(hit.createdAt)}`} onClick={() => onOpen(hit)}>{hit.n}</button> : <span key={index}>{part}</span>;
    })}</p>
    {shown.length > 0 && <ul className={styles.hits}>{shown.map((hit) => <li key={hit.messageId}><button type="button" onClick={() => onOpen(hit)}>
      <span className={styles.hitN}>{hit.n}</span>
      <span className={styles.hitCopy}><strong>{hit.title}</strong><small>{when(hit.createdAt)} · {hit.sender === "user" ? "You" : "Assistant"}</small><span>{hit.snippet}</span></span>
    </button></li>)}</ul>}
  </div>;
}

type Preset = { id: number; name: string; description?: string };
// One palette is open at a time; its "Ask your chats" request lives here, outside render.
const askAbort: { current: AbortController | null } = { current: null };

/**
 * Ctrl+K: one place to reach everything with the keyboard. Type to search
 * chats, actions, models, skills, projects and settings at once; "Change
 * model" and the like narrow the list to one kind; ">" shows only actions.
 */
export function CommandPalette({ onClose, onCommand, initialScope }: { onClose: () => void; onCommand: (id: CommandId) => void; initialScope?: Scope }) {
  const { conversations, projects, request, selectChat, selectedChatId, openProject } = useWorkspace();
  const { settings } = useSyncExternalStore(subscribeInteractions, getInteractions, getServerInteractions);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope | null>(initialScope || null);
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<{ query: string; items: Result[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = `${listId}-input`;
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  // Models come from the chat's own picker, so the list always matches the plan and providers.
  const [models] = useState(() => {
    const select = typeof document === "undefined" ? null : (document.getElementById("modelSelect") as HTMLSelectElement | null);
    return select ? Array.from(select.options).filter((option) => !option.disabled && option.value).map((option) => ({ value: option.value, label: (option.textContent || option.value).replace(/\s*\([^)]*\bcr\)\s*$/, "").trim(), cost: /\((\d+)\s*cr\)/.exec(option.textContent || "")?.[1], current: option.value === select.value })) : [];
  });

  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockWorkspaceScroll();
    node?.showModal();
    input.current?.focus();
    return () => { node?.close(); unlock(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => () => askAbort.current?.abort(), []);

  const text = query.trim();
  const commandsOnly = text.startsWith(">");
  const term = commandsOnly ? text.slice(1).trim() : text;

  // Skills load the first time they could be shown.
  const wantPresets = scope === "skills" || (!scope && term.length > 0);
  useEffect(() => {
    if (!wantPresets || presets) return;
    let live = true;
    request<{ items: Preset[] }>("presets").then((data) => { if (live) setPresets(data.items || []); }).catch(() => { if (live) setPresets([]); });
    return () => { live = false; };
  }, [wantPresets, presets, request]);

  // Chats: titles and messages on the server, debounced.
  const searchChats = !scope && !commandsOnly && term.length > 0;
  useEffect(() => {
    if (!searchChats) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      request<{ items: Result[] }>(`conversations?search=${encodeURIComponent(term)}&limit=20&archived=all`, { signal: abort.signal })
        .then((data) => { if (!abort.signal.aborted) setFound({ query: term, items: data.items || [] }); })
        .catch(() => { if (!abort.signal.aborted) setFound({ query: term, items: [] }); })
        .finally(() => { if (!abort.signal.aborted) setSearching(false); });
    }, 220);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [searchChats, term, request]);

  const finish = (action: () => void) => {
    onClose();
    // After the dialog has closed and given focus back, so actions can move it.
    requestAnimationFrame(() => requestAnimationFrame(action));
  };
  const runAsk = (question = term) => {
    askAbort.current?.abort();
    const abort = new AbortController();
    askAbort.current = abort;
    setAsk({ question, status: "loading" });
    askChats(question, abort.signal)
      .then((data) => { if (!abort.signal.aborted) setAsk({ question, status: "done", answer: data.answer, hits: data.hits }); })
      .catch((caught) => { if (!abort.signal.aborted) setAsk({ question, status: "error", error: caught.message }); });
  };
  const openHit = (hit: RecallHit) => finish(() => {
    selectChat(hit.conversationId);
    document.dispatchEvent(new CustomEvent("genyxo:focus-message", { detail: { id: hit.messageId } }));
  });
  const enter = (next: Scope) => { setScope(next); setQuery(""); setActive(0); setAsk(null); document.getElementById(inputId)?.focus(); };

  const rows = useMemo(() => {
    const out: Row[] = [];
    const binding = (id: string) => (settings.shortcuts[id]?.enabled ? settings.shortcuts[id].binding : undefined);
    const commandRow = (id: CommandId, group: string): Row | null => {
      const command = COMMANDS.find((item) => item.id === id);
      if (!command) return null;
      const scopeFor: Partial<Record<CommandId, Scope>> = { effort: "models", settings: "settings", skills: "skills", projects: "projects" };
      const target = scopeFor[id];
      return {
        key: `cmd-${id}`,
        group,
        label: command.title,
        title: <Match text={command.title} query={term} />,
        hint: command.hint,
        icon: command.icon,
        binding: binding(id === "help" ? "help" : id),
        opens: Boolean(target),
        run: target ? () => enter(target) : () => finish(() => onCommand(id)),
      };
    };
    const modelRows = (limit: number, group: string) =>
      models
        .map((model) => ({ model, score: matchScore(term, model.label, `${model.value} model`) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => (term ? b.score - a.score || a.model.label.length - b.model.label.length : 0))
        .slice(0, limit)
        .map(({ model }): Row => ({
          key: `model-${model.value}`,
          group,
          label: model.label,
          title: <Match text={model.label} query={term} />,
          hint: model.cost ? `${model.cost} credits a message` : model.value === "auto" ? "Picks the best model for each message" : "Free",
          image: modelIcon(model.value),
          current: model.current,
          run: () => finish(() => {
            const select = document.getElementById("modelSelect") as HTMLSelectElement | null;
            if (!select) return;
            select.value = model.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message: `Now using ${model.label}`, type: "success" } }));
            document.getElementById("userInput")?.focus();
          }),
        }));
    const skillRows = (limit: number, group: string) =>
      (presets || [])
        .filter((preset) => matchScore(term, preset.name, preset.description || "") > 0)
        .slice(0, limit)
        .map((preset): Row => ({
          key: `skill-${preset.id}`,
          group,
          label: preset.name,
          title: <Match text={preset.name} query={term} />,
          hint: preset.description || "Skill",
          icon: "sparkles",
          run: () => finish(() => {
            document.dispatchEvent(new CustomEvent("genyxo:composer-mention", { detail: { kind: "skill", id: String(preset.id), name: preset.name } }));
            document.getElementById("userInput")?.focus();
          }),
        }));
    const projectRows = (limit: number, group: string) =>
      projects
        .filter((project) => matchScore(term, project.name) > 0)
        .slice(0, limit)
        .map((project): Row => ({
          key: `project-${project.id}`,
          group,
          label: project.name,
          title: <Match text={project.name} query={term} />,
          hint: "Project",
          icon: "folder",
          run: () => finish(() => openProject(project.id)),
        }));
    const settingRows = (limit: number, group: string) =>
      SETTING_PAGES
        .map((page) => ({ page, score: matchScore(term, page.title, page.keywords) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => (term ? b.score - a.score : 0))
        .slice(0, limit)
        .map(({ page }): Row => ({
          key: `setting-${page.id}`,
          group,
          label: page.title,
          title: <Match text={page.title} query={term} />,
          hint: "Settings",
          icon: page.icon,
          run: () => finish(() => router.push(`/profile#${page.id}`)),
        }));
    const chatRow = (chat: Result, group: string): Row => ({
      key: `chat-${chat.id}`,
      group,
      label: chat.title,
      title: <Match text={chat.title} query={term} />,
      hint: chat.snippet ? <Match text={chat.snippet} query={term} /> : projects.find((project) => project.id === chat.projectId)?.name || when(chat.lastActivityAt || chat.updatedAt || chat.createdAt),
      icon: chat.archivedAt ? "archive" : "chat",
      current: chat.id === selectedChatId,
      run: () => finish(() => {
        selectChat(chat.id);
        if (chat.messageId) document.dispatchEvent(new CustomEvent("genyxo:focus-message", { detail: { id: chat.messageId } }));
      }),
    });

    if (scope === "models") return modelRows(80, "");
    if (scope === "skills") return skillRows(60, "");
    if (scope === "projects") return projectRows(60, "");
    if (scope === "settings") return settingRows(20, "");

    if (!term) {
      const suggested = COMMANDS.filter((command) => command.suggested).map((command) => commandRow(command.id, "Suggested")).filter(Boolean) as Row[];
      if (commandsOnly) return COMMANDS.map((command) => commandRow(command.id, "Actions")).filter(Boolean) as Row[];
      out.push(...suggested);
      out.push(...conversations.filter((chat) => !chat.archivedAt).slice(0, 6).map((chat) => chatRow(chat, "Recent chats")));
      return out;
    }
    const actions = COMMANDS
      .map((command) => ({ command, score: matchScore(term, command.title, `${command.keywords || ""} ${command.hint || ""}`) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, commandsOnly ? 20 : 5)
      .map(({ command }) => commandRow(command.id, "Actions"))
      .filter(Boolean) as Row[];
    out.push(...actions);
    if (commandsOnly) return out;
    out.push(...modelRows(4, "Models"), ...skillRows(3, "Skills"), ...projectRows(3, "Projects"), ...settingRows(3, "Settings"));
    // Matching actions come first; asking across all chats leads the chat results.
    const chats = found && found.query === term ? found.items : [];
    if (term.length >= 3)
      out.push({ key: "ask", group: "Chats", label: "Ask your chats", title: "Ask your chats", hint: `Answer “${term}” from everything you've discussed`, icon: "sparkles", run: () => runAsk() });
    out.push(...chats.slice(0, 12).map((chat) => chatRow(chat, "Chats")));
    return out;
    // `enter`, `finish` and `runAsk` only close over refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, term, commandsOnly, models, presets, projects, conversations, found, settings.shortcuts, selectedChatId]);

  const current = Math.min(active, Math.max(0, rows.length - 1));
  const move = (step: number) => {
    if (!rows.length) return;
    const next = (current + step + rows.length) % rows.length;
    setActive(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
  };
  const waiting = searchChats && (searching || !found || found.query !== term);

  return (
    <dialog
      ref={dialog}
      className={`ws-dialog ${styles.palette}`}
      aria-label="Command palette"
      onCancel={(event) => { event.preventDefault(); if (scope) { setScope(null); setQuery(""); } else close.current(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close.current(); }}
    >
      <div className={styles.field}>
        <WorkspaceIcon name="search" size={18} />
        {scope && (
          <button type="button" className={styles.scope} onClick={() => { setScope(null); setQuery(""); input.current?.focus(); }} aria-label={`Leave ${SCOPES[scope].title}`}>
            <WorkspaceIcon name={SCOPES[scope].icon} size={13} />
            {SCOPES[scope].title}
            <WorkspaceIcon name="close" size={12} />
          </button>
        )}
        <input
          ref={input}
          id={inputId}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={rows.length ? `${listId}-${current}` : undefined}
          aria-autocomplete="list"
          aria-label="Search chats, models and actions"
          placeholder={scope ? SCOPES[scope].placeholder : "Search chats, models, settings, or type > for actions"}
          value={query}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            if (ask && event.target.value.trim() !== ask.question) { askAbort.current?.abort(); setAsk(null); }
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown") { event.preventDefault(); move(1); }
            else if (event.key === "ArrowUp") { event.preventDefault(); move(-1); }
            else if (event.key === "Home" && event.ctrlKey) { event.preventDefault(); setActive(0); }
            else if (event.key === "Enter") { event.preventDefault(); rows[current]?.run(); }
            else if (event.key === "Backspace" && !query && scope) { event.preventDefault(); setScope(null); }
            else if (event.key === "Tab" && rows[current]?.opens) { event.preventDefault(); rows[current].run(); }
          }}
        />
        <Keys keys={["Esc"]} size="sm" className={styles.esc} />
      </div>
      <div ref={list} className={styles.list} role="listbox" id={listId} aria-label="Results" aria-busy={waiting}>
        {ask && <AskAnswer ask={ask} onOpen={openHit} onRetry={() => runAsk(ask.question)} />}
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {row.group && row.group !== rows[index - 1]?.group && <div className={styles.group} role="presentation">{row.group}</div>}
            <button
              type="button"
              role="option"
              id={`${listId}-${index}`}
              aria-selected={index === current}
              className={styles.row}
              data-active={index === current || undefined}
              onMouseMove={() => { if (index !== current) setActive(index); }}
              onClick={row.run}
            >
              <span className={styles.icon} aria-hidden="true">
                {row.image ? <img src={row.image} alt="" width={16} height={16} /> : <WorkspaceIcon name={row.icon || "grid"} size={16} />}
              </span>
              <span className={styles.copy}>
                <strong>{row.title}</strong>
                {row.hint && <small>{row.hint}</small>}
              </span>
              {row.current && <span className={styles.current} aria-label="Current"><WorkspaceIcon name="check" size={15} /></span>}
              {row.binding && <Keys binding={row.binding} size="sm" />}
              {row.opens && <WorkspaceIcon name="chevron" size={14} />}
            </button>
          </Fragment>
        ))}
        {waiting && <div className={styles.loading} aria-hidden="true"><i /><i /></div>}
        {!rows.length && !waiting && <div className={styles.empty}>{scope === "skills" && !presets ? "Loading skills…" : `Nothing matches “${term}”`}</div>}
      </div>
      <footer className={styles.footer}>
        <span><Keys keys={["↑", "↓"]} size="sm" /> Navigate</span>
        <span><Keys keys={["↵"]} size="sm" /> Open</span>
        {scope ? <span><Keys keys={["⌫"]} size="sm" /> Back</span> : <span><Keys keys={[">"]} size="sm" /> Actions only</span>}
        <span className={styles.footerEnd}><Keys keys={["Ctrl", "/"]} size="sm" /> All shortcuts</span>
      </footer>
    </dialog>
  );
}
