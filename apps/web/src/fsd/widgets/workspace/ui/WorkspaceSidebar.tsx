"use client";

import Link from "next/link";
import { readWorkspaceTheme, setWorkspaceTheme, type WorkspaceTheme } from "@/shared/lib/theme";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useLanguage } from "@/shared/i18n";
import { useSessionProfile } from "@/entities/session";
import {
  ShareDialog,
  isWorkspaceSignInError,
  useWorkspace,
  type WorkspaceConversation,
  type WorkspaceFile,
  type WorkspacePreferences,
  type WorkspaceProject,
} from "@/features/workspace";
import {
  WorkspaceDialog,
  WorkspaceIcon,
  WorkspaceMenu,
  WorkspaceSubmenu,
  WorkspaceTooltip,
} from "@/shared/ui/workspace";
import { ProjectGlyph, ProjectIconPicker } from "@/shared/ui/project-icons";
import { isChatPath } from "@/shared/lib/chat-url";
import { groupSidebarConversations } from "../model/sidebar-groups";
import { sidebarCopy } from "../model/sidebar-copy";
import "./WorkspaceSidebar.css";

type Entity =
  | { kind: "chat"; item: WorkspaceConversation }
  | { kind: "project"; item: WorkspaceProject };
type OpenMenu =
  | {
      kind: "footer" | "overview" | "settings" | "more";
      anchor: { x: number; y: number };
    }
  | { kind: "entity"; entity: Entity; anchor: { x: number; y: number } };
type Rename = { entity: Entity; value: string; error: string };

/**
 * A chat title cut off by the hover actions scrolls to its end and back, as
 * in ChatGPT; a title that fits stays still.
 */
function startTitleMarquee(row: HTMLElement) {
  const box = row.querySelector<HTMLElement>(".ws-row-title");
  const actions = row.querySelector<HTMLElement>(".ws-row-actions");
  if (!box) return;
  const covered = actions
    ? Math.max(0, box.getBoundingClientRect().right - actions.getBoundingClientRect().left + 8)
    : 0;
  const shift = box.scrollWidth - (box.clientWidth - covered);
  if (shift <= 2) {
    delete box.dataset.marquee;
    return;
  }
  box.style.setProperty("--marquee-shift", `${-shift}px`);
  box.style.setProperty("--marquee-time", `${(2.4 + shift / 32).toFixed(2)}s`);
  box.dataset.marquee = "true";
}

export function WorkspaceSidebar({
  collapsed,
  onToggle,
  onSearch,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onCloseMobile: () => void;
}) {
  const workspace = useWorkspace();
  const {
    conversations,
    projects,
    preferences,
    loading,
    error,
    request,
    refresh,
    notify,
    selectedChatId,
    activeProjectId,
    userId,
    generatingIds,
    unreadIds,
  } = workspace;
  const { lang, t } = useLanguage();
  const profile = useSessionProfile();
  const copy = useMemo(() => sidebarCopy(lang), [lang]);
  const label = (key: keyof typeof copy) =>
    t(`workspace.sidebar.${key}`, copy[key]);
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const renameInput = useRef<HTMLInputElement>(null);
  const renameBusy = useRef(false);
  const renameCancelled = useRef(false);
  const rowToFocus = useRef<string | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const menuBody = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  const [rename, setRename] = useState<Rename | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [createProject, setCreateProject] = useState<{
    moveChatId?: number;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<Entity | null>(null);
  const [shareChat, setShareChat] = useState<WorkspaceConversation | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [chatPatches, setChatPatches] = useState<
    Record<number, Partial<WorkspaceConversation>>
  >({});
  const [projectPatches, setProjectPatches] = useState<
    Record<number, Partial<WorkspaceProject>>
  >({});
  const [preferencePatch, setPreferencePatch] = useState<
    Partial<WorkspacePreferences>
  >({});
  const [expandedState, setExpandedState] = useState<{
    owner: number | null;
    ids: number[];
    projects: boolean;
  }>({ owner: null, ids: [], projects: true });
  const expanded = useMemo(
    () => (expandedState.owner === userId ? expandedState.ids : []),
    [expandedState.owner, expandedState.ids, userId],
  );
  const editingIdentity = rename
    ? `${rename.entity.kind}:${rename.entity.item.id}`
    : "";
  const [hoverProject, setHoverProject] = useState<number | null>(null);
  const [dragTarget, setDragTarget] = useState<number | null>(null);
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [archive, setArchive] = useState(false);
  const [archivedChats, setArchivedChats] = useState<WorkspaceConversation[]>(
    [],
  );
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiveHasMore, setArchiveHasMore] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [indicator, setIndicator] = useState<CSSProperties>({ opacity: 0 });
  const [theme, setTheme] = useState<WorkspaceTheme>("your");
  const prefs = { ...preferences, ...preferencePatch };
  const visibleChats = conversations
    .map((chat) => ({ ...chat, ...chatPatches[chat.id] }))
    .filter((chat) => !chat.archivedAt);
  const visibleProjects = projects
    .map((project) => ({ ...project, ...projectPatches[project.id] }))
    .sort(
      (a, b) =>
        Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) ||
        a.name.localeCompare(b.name, lang),
    );
  const pinned = visibleChats.filter((chat) => chat.pinnedAt);
  const projectTreeShown = prefs.showProjects && expandedState.projects;
  const recent = visibleChats.filter(
    (chat) =>
      !chat.pinnedAt &&
      (prefs.grouping === "list" ||
        !prefs.showProjects ||
        !chat.projectId ||
        !projects.some((project) => project.id === chat.projectId)),
  );
  const groups = groupSidebarConversations(
    recent,
    prefs.sort,
    lang,
    prefs.timezone,
    {
      today: label("today"),
      yesterday: label("yesterday"),
      week: label("week"),
      month: label("month"),
    },
    now,
  );

  const saveExpanded = useCallback(
    (ids: number[], show = expandedState.projects) => {
      setExpandedState({ owner: userId, ids, projects: show });
      if (userId !== null)
        try {
          localStorage.setItem(
            `genyxo:sidebar:v1:${userId}`,
            JSON.stringify({ ids, projects: show }),
          );
        } catch {
          /* Storage is optional. */
        }
    },
    [expandedState.projects, userId],
  );

  useEffect(() => {
    if (userId === null) return;
    let ids: number[] = [];
    let show = true;
    try {
      const saved = JSON.parse(
        localStorage.getItem(`genyxo:sidebar:v1:${userId}`) || "null",
      );
      if (saved && Array.isArray(saved.ids)) {
        ids = saved.ids.filter(
          (id: unknown) => typeof id === "number" && Number.isSafeInteger(id),
        );
        show = saved.projects !== false;
      }
    } catch {
      /* Corrupt or unavailable storage uses the mounted defaults. */
    }
    setExpandedState({ owner: userId, ids, projects: show });
  }, [userId]);
  useEffect(() => {
    if (!loading && expandedState.owner === userId) {
      const valid = expanded.filter((id) =>
        projects.some((project) => project.id === id),
      );
      if (valid.length !== expanded.length) saveExpanded(valid);
    }
  }, [projects, loading, expanded, expandedState.owner, userId, saveExpanded]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    const update = () => setNow(new Date());
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      if (dragTimer.current) clearTimeout(dragTimer.current);
    };
  }, []);
  useEffect(() => {
    const sync = () => setTheme(readWorkspaceTheme());
    sync();
    document.addEventListener("genyxo:workspace-theme", sync);
    window.addEventListener("storage", sync);
    return () => {
      document.removeEventListener("genyxo:workspace-theme", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if (editingIdentity) {
      renameInput.current?.focus();
      renameInput.current?.select();
    }
  }, [editingIdentity]);
  useLayoutEffect(() => {
    if (!rename && rowToFocus.current) {
      root.current
        ?.querySelector<HTMLButtonElement>(rowToFocus.current)
        ?.focus();
      rowToFocus.current = null;
    }
  }, [rename]);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const update = () => {
      let active = element.querySelector<HTMLElement>(
        '[data-workspace-active="true"]',
      );
      // A collapsed project keeps its rows mounted at zero height; mark the
      // project row instead of an empty slot under it.
      const folded = active?.closest('.ws-collapsible[data-open="false"]');
      if (active && folded)
        active =
          folded
            .closest(".ws-project-tree-item")
            ?.querySelector<HTMLElement>(".ws-project-row") ?? null;
      if (!active) {
        setIndicator({ opacity: 0 });
        return;
      }
      const bounds = element.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const clip = active
        .closest(".ws-sidebar-scroll")
        ?.getBoundingClientRect();
      const visible =
        !clip || (item.bottom > clip.top && item.top < clip.bottom);
      setIndicator({
        opacity: visible ? 1 : 0,
        transform: `translate(${item.left - bounds.left}px, ${item.top - bounds.top}px)`,
        width: item.width,
        height: item.height,
        ...(clip
          ? {
              clipPath: `inset(${Math.max(0, clip.top - item.top)}px 0 ${Math.max(0, item.bottom - clip.bottom)}px 0)`,
            }
          : {}),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, true);
    // Follow rows that move while a project or the project list folds.
    element.addEventListener("transitionend", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update, true);
      element.removeEventListener("transitionend", update, true);
      window.removeEventListener("resize", update);
    };
  }, [
    pathname,
    selectedChatId,
    activeProjectId,
    collapsed,
    expandedState,
    conversations,
    projects,
    chatPatches,
    prefs.grouping,
    prefs.sort,
    prefs.showProjects,
    loading,
  ]);

  function closeMenu() {
    setMenu(null);
  }
  function openMenu(
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    next:
      | Omit<Extract<OpenMenu, { kind: "entity" }>, "anchor">
      | { kind: "footer" | "overview" | "settings" | "more" },
  ) {
    event.preventDefault();
    event.stopPropagation();
    menuTrigger.current = event.currentTarget;
    const rect = event.currentTarget.getBoundingClientRect();
    const context = event.type === "contextmenu";
    const pointer = event as MouseEvent<HTMLElement>;
    const anchor = {
      x: context ? pointer.clientX : rect.left,
      y: context
        ? pointer.clientY
        : next.kind === "footer"
          ? rect.top
          : rect.bottom + 5,
    };
    setMenu({ ...next, anchor } as OpenMenu);
  }
  function entityKey(entity: Entity) {
    return `${entity.kind}:${entity.item.id}`;
  }
  function beginRename(entity: Entity) {
    if (pendingRef.current.has(entityKey(entity))) return;
    closeMenu();
    renameCancelled.current = false;
    rowToFocus.current = `[data-workspace-${entity.kind}="${entity.item.id}"] .ws-row-open`;
    setRename({
      entity,
      value: entity.kind === "chat" ? entity.item.title : entity.item.name,
      error: "",
    });
  }
  function cancelRename() {
    renameCancelled.current = true;
    if (!renameBusy.current) setRename(null);
  }
  async function saveRename() {
    if (!rename || renameBusy.current || renameCancelled.current) return;
    const value = rename.value.trim();
    const original =
      rename.entity.kind === "chat"
        ? rename.entity.item.title
        : rename.entity.item.name;
    const limit = rename.entity.kind === "project" ? 100 : 120;
    if (!value || value.length > limit) {
      setRename({ ...rename, error: label("invalidName") });
      renameInput.current?.focus();
      return;
    }
    if (value === original) {
      setRename(null);
      return;
    }
    renameBusy.current = true;
    setRenameSaving(true);
    try {
      await request(
        `${rename.entity.kind === "chat" ? "conversations" : "projects"}/${rename.entity.item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(
            rename.entity.kind === "chat" ? { title: value } : { name: value },
          ),
        },
      );
      if (rename.entity.kind === "chat")
        setChatPatches((state) => ({
          ...state,
          [rename.entity.item.id]: {
            ...state[rename.entity.item.id],
            title: value,
          },
        }));
      else
        setProjectPatches((state) => ({
          ...state,
          [rename.entity.item.id]: {
            ...state[rename.entity.item.id],
            name: value,
          },
        }));
      await refresh();
      clearEntityPatch(rename.entity);
      setRename(null);
      notify(label("saved"), "success");
    } catch (caught) {
      setRename(
        (state) =>
          state && {
            ...state,
            error:
              caught instanceof Error ? caught.message : label("loadError"),
          },
      );
    } finally {
      renameBusy.current = false;
      setRenameSaving(false);
    }
  }
  function rowKeyboard(event: KeyboardEvent<HTMLElement>, entity: Entity) {
    if (
      event.nativeEvent.isComposing ||
      event.target instanceof HTMLInputElement
    )
      return;
    if (event.key === "F2") {
      event.preventDefault();
      beginRename(entity);
    }
    if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey))
      openMenu(event, { kind: "entity", entity });
  }
  async function patchEntity(
    entity: Entity,
    patch: Record<string, unknown>,
    message = label("saved"),
  ) {
    const key = entityKey(entity);
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    setPending(new Set(pendingRef.current));
    closeMenu();
    const optimistic = {
      ...patch,
      ...(Object.hasOwn(patch, "pinned")
        ? { pinnedAt: patch.pinned ? new Date().toISOString() : null }
        : {}),
      ...(Object.hasOwn(patch, "archived")
        ? { archivedAt: patch.archived ? new Date().toISOString() : null }
        : {}),
    };
    if (entity.kind === "chat")
      setChatPatches((state) => ({
        ...state,
        [entity.item.id]: { ...state[entity.item.id], ...optimistic },
      }));
    else
      setProjectPatches((state) => ({
        ...state,
        [entity.item.id]: { ...state[entity.item.id], ...optimistic },
      }));
    try {
      await request(
        `${entity.kind === "chat" ? "conversations" : "projects"}/${entity.item.id}`,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      if (
        entity.kind === "chat" &&
        Object.hasOwn(patch, "projectId") &&
        selectedChatId === entity.item.id
      )
        workspace.setActiveProjectId(patch.projectId as number | null);
      if (
        entity.kind === "chat" &&
        patch.archived &&
        selectedChatId === entity.item.id
      )
        workspace.startNewChat();
      await refresh();
      clearEntityPatch(entity);
      if (archive) await loadArchive();
      notify(message, "success");
    } catch (caught) {
      if (entity.kind === "chat")
        setChatPatches((state) => {
          const next = { ...state };
          delete next[entity.item.id];
          return next;
        });
      else
        setProjectPatches((state) => {
          const next = { ...state };
          delete next[entity.item.id];
          return next;
        });
      notify(
        caught instanceof Error ? caught.message : label("loadError"),
        "error",
      );
    } finally {
      pendingRef.current.delete(key);
      setPending(new Set(pendingRef.current));
    }
  }
  function clearEntityPatch(entity: Entity) {
    if (entity.kind === "chat")
      setChatPatches((state) => {
        const next = { ...state };
        delete next[entity.item.id];
        return next;
      });
    else
      setProjectPatches((state) => {
        const next = { ...state };
        delete next[entity.item.id];
        return next;
      });
  }
  async function savePreference(patch: Partial<WorkspacePreferences>) {
    if (pendingRef.current.has("preferences")) return;
    pendingRef.current.add("preferences");
    setPending(new Set(pendingRef.current));
    setPreferencePatch(patch);
    try {
      await request("preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refresh();
    } catch (caught) {
      notify(
        caught instanceof Error ? caught.message : label("loadError"),
        "error",
      );
    } finally {
      setPreferencePatch({});
      pendingRef.current.delete("preferences");
      setPending(new Set(pendingRef.current));
    }
  }
  function newChat(projectId?: number) {
    closeMenu();
    workspace.startNewChat(projectId);
    if (!isChatPath(pathname)) router.push("/chat");
    onCloseMobile();
  }
  function selectChat(id: number) {
    closeMenu();
    workspace.selectChat(id);
    onCloseMobile();
  }
  function openProject(id: number) {
    closeMenu();
    workspace.openProject(id);
  }
  async function loadArchive(append = false) {
    setArchiveLoading(true);
    setArchiveError("");
    try {
      const result = await request<{
        items: WorkspaceConversation[];
        hasMore: boolean;
      }>(
        `conversations?archived=true&offset=${append ? archivedChats.length : 0}&limit=50`,
      );
      setArchivedChats((previous) =>
        append
          ? [
              ...previous,
              ...result.items.filter(
                (item) => !previous.some((existing) => existing.id === item.id),
              ),
            ]
          : result.items,
      );
      setArchiveHasMore(result.hasMore);
    } catch (caught) {
      setArchiveError(
        caught instanceof Error ? caught.message : label("loadError"),
      );
    } finally {
      setArchiveLoading(false);
    }
  }
  function showArchive() {
    closeMenu();
    setArchive(true);
    void loadArchive();
  }
  function applyTheme(value: WorkspaceTheme) {
    setWorkspaceTheme(value);
    closeMenu();
  }
  async function deleteEntity() {
    if (!confirmation || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await request(
        `${confirmation.kind === "chat" ? "conversations" : "projects"}/${confirmation.item.id}`,
        { method: "DELETE" },
      );
      if (
        confirmation.kind === "chat" &&
        selectedChatId === confirmation.item.id
      )
        workspace.startNewChat();
      if (
        confirmation.kind === "project" &&
        activeProjectId === confirmation.item.id
      )
        workspace.setActiveProjectId(null);
      await refresh();
      if (archive) await loadArchive();
      setConfirmation(null);
      notify(label("deleted"), "success");
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : label("loadError"),
      );
    } finally {
      setDeleting(false);
    }
  }
  const iconButton = (
    name: string,
    text: string,
    onClick: (event: MouseEvent<HTMLButtonElement>) => void,
    shortcut?: string,
  ) => (
    <WorkspaceTooltip label={text} shortcut={shortcut} side={collapsed ? "right" : "bottom"}>
      <button
        type="button"
        className="ws-sidebar-icon ws-btn"
        aria-label={text}
        onClick={onClick}
      >
        <WorkspaceIcon name={name} />
      </button>
    </WorkspaceTooltip>
  );
  function renameField(entity: Entity) {
    if (
      !rename ||
      rename.entity.kind !== entity.kind ||
      rename.entity.item.id !== entity.item.id
    )
      return null;
    return (
      <div className="ws-inline-edit">
        <input
          ref={renameInput}
          aria-label={label("rename")}
          aria-invalid={Boolean(rename.error)}
          aria-describedby={rename.error ? "workspace-rename-error" : undefined}
          value={rename.value}
          disabled={renameSaving}
          maxLength={entity.kind === "project" ? 100 : 120}
          onChange={(event) =>
            setRename({ ...rename, value: event.target.value, error: "" })
          }
          onBlur={() => {
            if (!rename.error) void saveRename();
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") {
              event.preventDefault();
              void saveRename();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              cancelRename();
            }
          }}
        />
        {rename.error && (
          <div
            className="ws-inline-error"
            id="workspace-rename-error"
            role="alert"
          >
            {rename.error}
            <div>
              <button
                type="button"
                className="ws-btn"
                disabled={renameSaving}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void saveRename()}
              >
                {label("retry")}
              </button>
              <button
                type="button"
                className="ws-btn"
                disabled={renameSaving}
                onClick={cancelRename}
              >
                {label("cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  function chatRow(chat: WorkspaceConversation, archived = false) {
    const entity: Entity = { kind: "chat", item: chat };
    const editing =
      rename?.entity.kind === "chat" && rename.entity.item.id === chat.id;
    const projectName = projects.find(
      (project) => project.id === chat.projectId,
    )?.name;
    return (
      <div
        key={chat.id}
        className={`ws-sidebar-row ws-chat-row${pending.has(entityKey(entity)) ? " is-pending" : ""}`}
        data-workspace-chat={chat.id}
        data-workspace-active={
          isChatPath(pathname) && selectedChatId === chat.id && !archived
            ? "true"
            : undefined
        }
        onContextMenu={(event) => {
          if (!editing) openMenu(event, { kind: "entity", entity });
        }}
        onMouseEnter={(event) => startTitleMarquee(event.currentTarget)}
        onKeyDown={(event) => rowKeyboard(event, entity)}
        draggable={!editing && !pending.has(entityKey(entity)) && !archived}
        onDragStart={(event) => {
          event.dataTransfer.setData(
            "application/x-genyxo-chat",
            String(chat.id),
          );
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          setDragTarget(null);
          setHoverProject(null);
          if (dragTimer.current) clearTimeout(dragTimer.current);
        }}
      >
        {editing ? (
          renameField(entity)
        ) : (
          <button
            type="button"
            className="ws-row-open ws-btn"
            onClick={() => {
              if (archived) setArchive(false);
              selectChat(chat.id);
            }}
            aria-current={
              selectedChatId === chat.id && isChatPath(pathname)
                ? "page"
                : undefined
            }
          >
            <span className={`ws-row-title${generatingIds.includes(chat.id) ? " is-generating" : ""}`}>
              <span className="ws-row-title-text">
                {chat.title || label("newChat")}
              </span>
            </span>
            {unreadIds.includes(chat.id) && !generatingIds.includes(chat.id) && (
              <span className="ws-unread-dot" role="img" aria-label="New answer" />
            )}
            {projectName &&
              (chat.pinnedAt || prefs.grouping === "list" || archived) && (
                <span className="ws-project-caption">{projectName}</span>
              )}
          </button>
        )}
        {!editing && (
          <div className="ws-row-actions">
            <WorkspaceTooltip label={label("chatMenu")} side="bottom">
              <button
                type="button"
                className="ws-sidebar-icon ws-btn"
                aria-label={label("chatMenu")}
                aria-haspopup="menu"
                onClick={(event) => openMenu(event, { kind: "entity", entity })}
              >
                <WorkspaceIcon name="more" size={16} />
              </button>
            </WorkspaceTooltip>
            <WorkspaceTooltip label={label(chat.pinnedAt ? "unpin" : "pin")} side="bottom">
              <button
                type="button"
                className={`ws-sidebar-icon ws-btn${chat.pinnedAt ? " is-pinned" : ""}`}
                aria-label={label(chat.pinnedAt ? "unpin" : "pin")}
                aria-pressed={Boolean(chat.pinnedAt)}
                disabled={pending.has(entityKey(entity))}
                onClick={() =>
                  void patchEntity(entity, { pinned: !chat.pinnedAt })
                }
              >
                <WorkspaceIcon name="pin" size={14} />
              </button>
            </WorkspaceTooltip>
          </div>
        )}
      </div>
    );
  }
  function menuAction(
    text: string,
    action: () => void,
    icon?: string,
    danger = false,
    disabled = false,
  ) {
    return (
      <button
        type="button"
        role="menuitem"
        className={`ws-sidebar-menu-item${danger ? " is-danger" : ""}`}
        disabled={disabled}
        onClick={action}
      >
        {icon && <WorkspaceIcon name={icon} size={16} />}
        <span>{text}</span>
      </button>
    );
  }
  function menuLink(text: string, href: string, icon: string) {
    return (
      <Link
        role="menuitem"
        className="ws-sidebar-menu-item"
        href={href}
        onClick={() => {
          closeMenu();
          onCloseMobile();
        }}
      >
        <WorkspaceIcon name={icon} size={16} />
        <span>{text}</span>
      </Link>
    );
  }
  const navItems = [
    { href: "/library", key: "library" as const, icon: "library" },
    { href: "/plugins", key: "plugins" as const, icon: "plugins" },
    { href: "/scheduled", key: "scheduled" as const, icon: "clock" },
  ];
  if (!collapsed) navItems.unshift(...navItems.splice(2, 1));

  return (
    <div
      ref={root}
      className={`ws-sidebar-inner${collapsed ? " is-compact" : ""}`}
    >
      <div
        className="ws-sidebar-active-indicator"
        aria-hidden="true"
        style={indicator}
      />
      <header className="ws-sidebar-header">
        {!collapsed && (
          <Link
            href="/"
            className="ws-sidebar-brand"
            aria-label="Genyxo home"
            onClick={onCloseMobile}
          >
            <span className="ws-brand-mark" aria-hidden="true">
              <img src="/images/logo.svg" width="24" height="24" alt="" />
            </span>
            <span>Genyxo</span>
          </Link>
        )}
        <div className="ws-header-actions">
          {collapsed &&
            iconButton("panel", label("expand"), onToggle, "Ctrl+Shift+S")}
          {iconButton(
            "search",
            label("search"),
            () => {
              onCloseMobile();
              onSearch();
            },
            "Ctrl+K",
          )}
          {!collapsed &&
            iconButton("panel", label("collapse"), onToggle, "Ctrl+Shift+S")}
        </div>
      </header>
      <nav
        className="ws-sidebar-nav"
        aria-label={t("workspace.navigation", "Workspace navigation")}
      >
        <WorkspaceTooltip
          label={label("newChat")}
          shortcut="Ctrl+Shift+O"
          disabled={!collapsed}
        >
          <button
            type="button"
            className="ws-new-chat ws-nav-item ws-btn"
            aria-label={label("newChat")}
            onClick={() => newChat()}
          >
            <WorkspaceIcon name="new" />
            <span className="ws-expanded-label">{label("newChat")}</span>
            <span
              className="ws-new-chat-shortcut ws-expanded-label"
              aria-hidden="true"
            >
              ⇧ O
            </span>
          </button>
        </WorkspaceTooltip>
        {navItems.map((item) => (
          <WorkspaceTooltip
            key={item.href}
            label={label(item.key)}
            disabled={!collapsed}
          >
            <Link
              href={item.href}
              className="ws-nav-item"
              data-workspace-active={
                pathname === item.href ? "true" : undefined
              }
              aria-label={label(item.key)}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={onCloseMobile}
            >
              <WorkspaceIcon name={item.icon} />
              <span className="ws-expanded-label">{label(item.key)}</span>
            </Link>
          </WorkspaceTooltip>
        ))}
        <WorkspaceTooltip label={label("overview")} disabled={!collapsed}>
          <button
            type="button"
            className="ws-nav-item ws-btn"
            aria-label={label("overview")}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === "overview"}
            onClick={(event) => openMenu(event, { kind: "overview" })}
          >
            <WorkspaceIcon name="more" />
            <span className="ws-expanded-label">{label("overview")}</span>
            <span className="ws-expanded-label ws-nav-chevron">
              <WorkspaceIcon name="chevron" size={14} />
            </span>
          </button>
        </WorkspaceTooltip>
      </nav>
      <div
        ref={scroll}
        className="ws-sidebar-scroll"
        hidden={collapsed}
        onScroll={() => {
          if (menu?.kind === "entity") closeMenu();
        }}
        onDragOver={(event) => {
          const region = scroll.current?.getBoundingClientRect();
          if (region) {
            const offset =
              event.clientY < region.top + 45
                ? -14
                : event.clientY > region.bottom - 45
                  ? 14
                  : 0;
            if (offset) scroll.current?.scrollBy({ top: offset });
          }
        }}
      >
        {loading ? (
          <div
            role="status"
            aria-label={label("loading")}
            className="ws-sidebar-skeleton"
          >
            {Array.from({ length: 8 }, (_, index) => (
              <span
                key={index}
                style={{ width: `${65 + (index % 3) * 12}%` }}
              />
            ))}
          </div>
        ) : error && isWorkspaceSignInError(error) ? (
          <div className="gx-signin-card">
            <span className="gx-signin-icon">
              <WorkspaceIcon name="sparkles" size={18} />
            </span>
            <strong>
              {t("workspace.signin_title", "Your workspace awaits")}
            </strong>
            <p>
              {t(
                "workspace.signin_text",
                "Sign in to keep chats, projects and files in one place.",
              )}
            </p>
            <div className="gx-signin-actions">
              <Link
                className="gx-btn gx-btn-primary"
                href="/sign-in"
                onClick={onCloseMobile}
              >
                {t("workspace.signin", "Sign in")}
              </Link>
              <Link
                className="gx-btn"
                href="/sign-in?mode=signup"
                onClick={onCloseMobile}
              >
                {t("workspace.signup", "Sign up")}
              </Link>
            </div>
          </div>
        ) : error ? (
          <div className="ws-sidebar-load-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="ws-btn"
              onClick={() => void refresh()}
            >
              {label("retry")}
            </button>
          </div>
        ) : (
          <>
            {prefs.showProjects && (
              <section
                className="ws-sidebar-projects"
                aria-label={label("projects")}
              >
                <div className="ws-sidebar-section-heading">
                  {/* A plain label as in ChatGPT: the chevron and + fade in on hover. */}
                  <button
                    type="button"
                    className="ws-section-toggle"
                    aria-expanded={expandedState.projects}
                    aria-controls="workspace-project-tree"
                    onClick={() =>
                      saveExpanded(expanded, !expandedState.projects)
                    }
                  >
                    <span>{label("projects")}</span>
                    <WorkspaceIcon name="chevron" size={12} />
                  </button>
                  <div className="ws-section-actions">
                    {iconButton("plus", label("createProject"), () =>
                      setCreateProject({}),
                    )}
                  </div>
                </div>
                <div
                  id="workspace-project-tree"
                  className="ws-collapsible"
                  data-open={projectTreeShown}
                  inert={!projectTreeShown}
                >
                  <div className="ws-collapsible-inner">
                  {visibleProjects.length === 0 && (
                    <p className="ws-sidebar-empty">{label("noProjects")}</p>
                  )}
                  {visibleProjects.map((project) => {
                    const entity: Entity = { kind: "project", item: project };
                    const editing =
                      rename?.entity.kind === "project" &&
                      rename.entity.item.id === project.id;
                    const open =
                      expanded.includes(project.id) ||
                      hoverProject === project.id;
                    const chats = visibleChats.filter(
                      (chat) => chat.projectId === project.id && !chat.pinnedAt,
                    );
                    const sorted = groupSidebarConversations(
                      chats,
                      prefs.sort,
                      lang,
                      prefs.timezone,
                      { today: "", yesterday: "", week: "", month: "" },
                      now,
                    ).flatMap((group) => group.items);
                    return (
                      <div
                        className={`ws-project-tree-item${dragTarget === project.id ? " is-drop-target" : ""}`}
                        key={project.id}
                        onDragEnter={(event) => {
                          if (
                            !event.dataTransfer.types.includes(
                              "application/x-genyxo-chat",
                            )
                          )
                            return;
                          event.preventDefault();
                          setDragTarget(project.id);
                          if (dragTimer.current)
                            clearTimeout(dragTimer.current);
                          dragTimer.current = setTimeout(
                            () => setHoverProject(project.id),
                            500,
                          );
                        }}
                        onDragLeave={(event) => {
                          if (
                            event.relatedTarget instanceof Node &&
                            event.currentTarget.contains(event.relatedTarget)
                          )
                            return;
                          setDragTarget(null);
                          setHoverProject(null);
                          if (dragTimer.current)
                            clearTimeout(dragTimer.current);
                        }}
                        onDragOver={(event) => {
                          if (
                            event.dataTransfer.types.includes(
                              "application/x-genyxo-chat",
                            )
                          ) {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (dragTimer.current)
                            clearTimeout(dragTimer.current);
                          const id = Number(
                            event.dataTransfer.getData(
                              "application/x-genyxo-chat",
                            ),
                          );
                          const chat = visibleChats.find(
                            (item) => item.id === id,
                          );
                          setDragTarget(null);
                          setHoverProject(null);
                          if (chat && chat.projectId !== project.id) {
                            saveExpanded([
                              ...new Set([...expanded, project.id]),
                            ]);
                            void patchEntity(
                              { kind: "chat", item: chat },
                              { projectId: project.id },
                              label("moved"),
                            );
                          }
                        }}
                      >
                        <div
                          className="ws-sidebar-row ws-project-row"
                          data-workspace-project={project.id}
                          onContextMenu={(event) => {
                            if (!editing)
                              openMenu(event, { kind: "entity", entity });
                          }}
                          onKeyDown={(event) => rowKeyboard(event, entity)}
                        >
                          {editing ? (
                            renameField(entity)
                          ) : (
                            <button
                              type="button"
                              className="ws-row-open ws-btn"
                              onClick={() => openProject(project.id)}
                            >
                              <ProjectGlyph
                                icon={project.icon}
                                color={project.color}
                                size={17}
                              />
                              <span className="ws-row-title">
                                {project.name}
                              </span>
                              {project.pinnedAt && (
                                <WorkspaceIcon name="pin" size={12} />
                              )}
                            </button>
                          )}
                          {!editing && (
                            <button
                              type="button"
                              className="ws-project-chevron"
                              aria-label={`${open ? label("collapse") : label("expand")}: ${project.name}`}
                              aria-expanded={open}
                              aria-controls={`workspace-project-chats-${project.id}`}
                              onClick={() =>
                                saveExpanded(
                                  expanded.includes(project.id)
                                    ? expanded.filter((id) => id !== project.id)
                                    : [...expanded, project.id],
                                )
                              }
                            >
                              <WorkspaceIcon name="chevron" size={11} />
                            </button>
                          )}
                          {!editing && (
                            <div className="ws-row-actions">
                              {iconButton(
                                "more",
                                `${label("projectMenu")}: ${project.name}`,
                                (event) =>
                                  openMenu(event, { kind: "entity", entity }),
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          id={`workspace-project-chats-${project.id}`}
                          className="ws-project-chats ws-collapsible"
                          data-open={open}
                          inert={!open}
                        >
                          <div className="ws-collapsible-inner">
                          {prefs.grouping === "projects" &&
                            sorted.map((chat) => chatRow(chat))}
                          {(chats.length === 0 ||
                            prefs.grouping === "list") && (
                            <div className="ws-project-empty">
                              <p>
                                {visibleChats.some(
                                  (chat) =>
                                    chat.projectId === project.id &&
                                    chat.pinnedAt,
                                )
                                  ? label("pinnedHint")
                                  : label("drop")}
                              </p>
                              <button
                                type="button"
                                className="ws-btn"
                                onClick={() => newChat(project.id)}
                              >
                                <WorkspaceIcon name="plus" size={14} />
                                {label("newChat")}
                              </button>
                            </div>
                          )}
                          {chats.length > 0 &&
                            prefs.grouping === "projects" && (
                              <button
                                type="button"
                                className="ws-project-new-chat ws-btn"
                                onClick={() => newChat(project.id)}
                              >
                                <WorkspaceIcon name="plus" size={13} />
                                {label("newChat")}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </section>
            )}
            {pinned.length > 0 && (
              <section className="ws-pinned-chats" aria-label={label("pinned")}>
                <h2 className="ws-sidebar-section-label">{label("pinned")}</h2>
                {pinned.map((chat) => chatRow(chat))}
              </section>
            )}
            <section className="ws-sidebar-recent" aria-label={label("recent")}>
              <div className="ws-sidebar-section-heading">
                <h2>{label("recent")}</h2>
                <div className="ws-section-actions">
                  {iconButton("more", label("listActions"), (event) =>
                    openMenu(event, { kind: "more" }),
                  )}
                  {iconButton("sort", label("listSettings"), (event) =>
                    openMenu(event, { kind: "settings" }),
                  )}
                  {iconButton("new", label("newChat"), () => newChat())}
                </div>
              </div>
              {groups.map((group) => (
                <div key={group.key}>
                  {group.label && (
                    <h3 className="ws-date-label">{group.label}</h3>
                  )}
                  {group.items.map((chat) => chatRow(chat))}
                </div>
              ))}
              {recent.length === 0 && (
                <p className="ws-sidebar-empty">{label("noChats")}</p>
              )}
              {workspace.conversationHasMore && (
                <button
                  type="button"
                  className="ws-project-new-chat ws-btn"
                  disabled={workspace.loadingMore}
                  onClick={() => void workspace.loadMore()}
                >
                  {workspace.loadingMore ? label("loading") : label("loadMore")}
                </button>
              )}
            </section>
          </>
        )}
      </div>
      <footer className="ws-sidebar-footer">
        <WorkspaceTooltip label={label("menu")} disabled={!collapsed}>
          <button
            type="button"
            className="ws-nav-item ws-btn ws-footer-menu"
            aria-label={label("menu")}
            aria-haspopup="menu"
            aria-expanded={menu?.kind === "footer"}
            onClick={(event) => openMenu(event, { kind: "footer" })}
          >
            {profile ? (
              <>
                <span className="gx-account-avatar" aria-hidden="true">
                  <img
                    src={
                      profile.avatar ||
                      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name || "User")}`
                    }
                    alt=""
                    width="32"
                    height="32"
                  />
                </span>
                <span className="ws-expanded-label gx-account-copy">
                  <span className="gx-account-name">{profile.name}</span>
                  <span className="gx-account-credits">
                    <WorkspaceIcon name="gem" size={11} />
                    {Number(profile.credits || 0).toLocaleString(lang)}{" "}
                    {t("workspace.credits", "credits")}
                  </span>
                </span>
                <span className="ws-expanded-label gx-account-more">
                  <WorkspaceIcon name="more" size={18} />
                </span>
              </>
            ) : (
              <>
                <WorkspaceIcon name="menu" />
                <span className="ws-expanded-label">{label("menu")}</span>
              </>
            )}
          </button>
        </WorkspaceTooltip>
      </footer>
      {menu && (
        <WorkspaceMenu
          onClose={closeMenu}
          anchor={menu.anchor}
          trigger={menuTrigger.current}
          className={menu.kind === "overview" ? "ws-overview-menu" : ""}
          placement={
            menu.kind === "footer"
              ? "top"
              : menu.kind === "overview"
                ? "right"
                : "bottom"
          }
        >
          <div ref={menuBody}>
            {menu.kind === "overview" && (
              <>
                {menuLink(label("maps"), "/maps", "maps")}
                {menuLink(label("images"), "/library?tab=images", "image")}
                {menuLink(label("assistants"), "/plugins?tab=skills", "cube")}
                <button
                  type="button"
                  role="menuitem"
                  className="ws-sidebar-menu-item"
                  aria-disabled="true"
                  aria-describedby="workspace-overview-planned"
                  onClick={() => notify(label("planned"))}
                >
                  <WorkspaceIcon name="sites" />
                  <span>{label("sites")}</span>
                </button>
                {menuLink(label("integrations"), "/plugins", "plugins")}
                <span id="workspace-overview-planned" className="ws-sr-only">
                  {label("planned")}
                </span>
              </>
            )}
            {menu.kind === "more" && (
              <>
                {menuAction(label("archive"), showArchive, "archive")}
                {menuAction(
                  label("search"),
                  () => {
                    closeMenu();
                    onSearch();
                  },
                  "search",
                )}
              </>
            )}
            {menu.kind === "settings" && (
              <>
                {menuAction(
                  "Memory",
                  () => {
                    closeMenu();
                    document.dispatchEvent(new CustomEvent("genyxo:open-memory"));
                  },
                  "sparkles",
                )}
                <WorkspaceSubmenu label={label("grouping")} icon="panel">
                  {(["projects", "list"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      role="menuitemradio"
                      aria-checked={prefs.grouping === value}
                      className="ws-sidebar-menu-item"
                      disabled={pending.has("preferences")}
                      onClick={() => void savePreference({ grouping: value })}
                    >
                      <WorkspaceIcon
                        name={value === "projects" ? "folder" : "list"}
                        size={16}
                      />
                      <span>
                        {label(value === "projects" ? "byProject" : "oneList")}
                      </span>
                      {prefs.grouping === value && (
                        <WorkspaceIcon name="check" size={15} />
                      )}
                    </button>
                  ))}
                </WorkspaceSubmenu>
                <WorkspaceSubmenu label={label("sort")} icon="sort">
                  {(["activity", "name"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      role="menuitemradio"
                      aria-checked={prefs.sort === value}
                      className="ws-sidebar-menu-item"
                      disabled={pending.has("preferences")}
                      onClick={() => void savePreference({ sort: value })}
                    >
                      <span>{label(value)}</span>
                      {prefs.sort === value && (
                        <WorkspaceIcon name="check" size={15} />
                      )}
                    </button>
                  ))}
                </WorkspaceSubmenu>
                <div className="ws-menu-divider" />
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={prefs.showProjects}
                  className="ws-sidebar-menu-item"
                  disabled={pending.has("preferences")}
                  onClick={() =>
                    void savePreference({
                      showProjects: !prefs.showProjects,
                    })
                  }
                >
                  <span>{label("showProjects")}</span>
                  {prefs.showProjects && (
                    <WorkspaceIcon name="check" size={15} />
                  )}
                </button>
              </>
            )}
            {menu.kind === "footer" && (
              <>
                {menuLink(label("history"), "/profile#transactions", "clock")}
                <WorkspaceSubmenu label={label("theme")} icon="settings">
                  {(["your", "dark", "light"] as const).map((value) => (
                    <button
                      type="button"
                      key={value}
                      role="menuitemradio"
                      aria-checked={theme === value}
                      className="ws-sidebar-menu-item"
                      onClick={() => applyTheme(value)}
                    >
                      <span>{value === "your" ? t("workspace.sidebar.your_theme", "Your theme") : label(value)}</span>
                      {theme === value && (
                        <WorkspaceIcon name="check" size={15} />
                      )}
                    </button>
                  ))}
                </WorkspaceSubmenu>
                {menuAction(label("archive"), showArchive, "archive")}
                <div className="ws-menu-divider" />
                {menuLink(label("help"), "/support", "help")}
                <a
                  role="menuitem"
                  className="ws-sidebar-menu-item"
                  href="mailto:info@genyxo.com"
                  onClick={closeMenu}
                >
                  <WorkspaceIcon name="help" size={16} />
                  <span>{label("feedback")}</span>
                </a>
                <div className="ws-menu-divider" />
                {menuLink(label("privacy"), "/policies/privacy-policy", "file")}
                {menuLink(label("terms"), "/policies/terms-of-service", "file")}
                {menuLink(label("faq"), "/policies/faq", "help")}
              </>
            )}
            {menu.kind === "entity" && (
              <>
                {menuAction(
                  label("rename"),
                  () => beginRename(menu.entity),
                  "edit",
                )}
                {menuAction(
                  label(menu.entity.item.pinnedAt ? "unpin" : "pin"),
                  () =>
                    void patchEntity(menu.entity, {
                      pinned: !menu.entity.item.pinnedAt,
                    }),
                  "pin",
                )}
                {menu.entity.kind === "chat" ? (
                  <>
                    <div className="ws-menu-divider" />
                    {menuAction(
                      label("share"),
                      () => {
                        setShareChat(menu.entity.item as WorkspaceConversation);
                        closeMenu();
                      },
                      "share",
                    )}
                    <div className="ws-menu-divider" />
                    {menuAction(
                      label(
                        (menu.entity.item as WorkspaceConversation).archivedAt
                          ? "restore"
                          : "archiveChat",
                      ),
                      () =>
                        void patchEntity(
                          menu.entity,
                          {
                            archived: !(
                              menu.entity.item as WorkspaceConversation
                            ).archivedAt,
                          },
                          label(
                            (menu.entity.item as WorkspaceConversation)
                              .archivedAt
                              ? "restored"
                              : "archived",
                          ),
                        ),
                      "archive",
                    )}
                  </>
                ) : (
                  <>
                    {menuAction(
                      label("newChat"),
                      () => newChat(menu.entity.item.id),
                      "new",
                    )}
                    {menuAction(
                      label("projectContext"),
                      () => openProject(menu.entity.item.id),
                      "folder",
                    )}
                  </>
                )}
                {menuAction(
                  label("delete"),
                  () => {
                    setConfirmation(menu.entity);
                    setDeleteError("");
                    closeMenu();
                  },
                  "trash",
                  true,
                )}
                {menu.entity.kind === "chat" && (
                  <>
                    <div className="ws-menu-divider" />
                    <WorkspaceSubmenu label={label("move")} icon="move">
                      {(menu.entity.item as WorkspaceConversation).projectId &&
                        menuAction(
                          label("noProject"),
                          () => {
                            if (menu.entity.kind === "chat")
                              void patchEntity(
                                menu.entity,
                                { projectId: null },
                                label("moved"),
                              );
                          },
                          "folder",
                        )}
                      {visibleProjects.map((project) => (
                        <button
                          type="button"
                          key={project.id}
                          role="menuitem"
                          className="ws-sidebar-menu-item"
                          disabled={
                            (menu.entity.item as WorkspaceConversation)
                              .projectId === project.id
                          }
                          onClick={() =>
                            void patchEntity(
                              menu.entity,
                              { projectId: project.id },
                              label("moved"),
                            )
                          }
                        >
                          <WorkspaceIcon name="folder" size={16} />
                          <span>{project.name}</span>
                          {(menu.entity.item as WorkspaceConversation)
                            .projectId === project.id && (
                            <WorkspaceIcon name="check" size={14} />
                          )}
                        </button>
                      ))}
                      <div className="ws-menu-divider" />
                      {menuAction(
                        label("createProject"),
                        () => {
                          setCreateProject({ moveChatId: menu.entity.item.id });
                          closeMenu();
                        },
                        "plus",
                      )}
                    </WorkspaceSubmenu>
                  </>
                )}
              </>
            )}
          </div>
        </WorkspaceMenu>
      )}
      {createProject && (
        <CreateProjectDialog
          moveChatId={createProject.moveChatId}
          onClose={() => setCreateProject(null)}
          onCreated={(project) => {
            saveExpanded([...new Set([...expanded, project.id])], true);
            setCreateProject(null);
            workspace.openProject(project.id);
          }}
        />
      )}
      {shareChat && (
        <ShareDialog
          chatId={shareChat.id}
          title={shareChat.title}
          livePreview={isChatPath(pathname) && selectedChatId === shareChat.id}
          onClose={() => setShareChat(null)}
        />
      )}
      {confirmation && (
        <WorkspaceDialog
          title={label(
            confirmation.kind === "chat" ? "deleteChat" : "deleteProject",
          )}
          onClose={() => {
            if (!deleting) setConfirmation(null);
          }}
        >
          <p className="ws-delete-name">
            {confirmation.kind === "chat"
              ? confirmation.item.title
              : confirmation.item.name}
          </p>
          <p>
            {label(
              confirmation.kind === "chat"
                ? "deleteChatHint"
                : "deleteProjectHint",
            )}
          </p>
          {deleteError && (
            <p role="alert" className="ws-inline-error">
              {deleteError}
            </p>
          )}
          <div className="ws-dialog-actions">
            <button
              type="button"
              className="ws-btn"
              disabled={deleting}
              onClick={() => setConfirmation(null)}
            >
              {label("cancel")}
            </button>
            <button
              type="button"
              className="ws-btn ws-sidebar-danger"
              disabled={deleting}
              aria-busy={deleting}
              onClick={() => void deleteEntity()}
            >
              {label("delete")}
            </button>
          </div>
        </WorkspaceDialog>
      )}
      {archive && (
        <WorkspaceDialog
          title={label("archive")}
          onClose={() => {
            setArchive(false);
            setRename(null);
          }}
        >
          <div className="ws-sidebar-archive">
            {archivedChats.map((chat) => chatRow(chat, true))}
            {archiveLoading && <p role="status">{label("loading")}</p>}
            {archiveError && (
              <div role="alert">
                <p>{archiveError}</p>
                <button
                  type="button"
                  className="ws-btn"
                  onClick={() => void loadArchive()}
                >
                  {label("retry")}
                </button>
              </div>
            )}
            {!archiveLoading && !archiveError && archivedChats.length === 0 && (
              <p>{label("noArchived")}</p>
            )}
            {archiveHasMore && (
              <button
                type="button"
                className="ws-btn"
                disabled={archiveLoading}
                onClick={() => void loadArchive(true)}
              >
                {label("more")}
              </button>
            )}
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}

function CreateProjectDialog({
  onClose,
  onCreated,
  moveChatId,
}: {
  onClose: () => void;
  onCreated: (project: WorkspaceProject) => void;
  moveChatId?: number;
}) {
  const { request, refresh, notify } = useWorkspace();
  const { lang, t } = useLanguage();
  const copy = sidebarCopy(lang);
  const label = (key: keyof typeof copy) =>
    t(`workspace.sidebar.${key}`, copy[key]);
  const [name, setName] = useState("");
  const [appearance, setAppearance] = useState<{
    icon: string | null;
    color: string | null;
  }>({ icon: null, color: null });
  const [instructions, setInstructions] = useState("");
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [error, setError] = useState("");
  const [invalidName, setInvalidName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fileGeneration = useRef(0);
  const submitLock = useRef(false);
  const [createdProject, setCreatedProject] = useState<WorkspaceProject | null>(
    null,
  );
  useEffect(
    () => () => {
      fileGeneration.current += 1;
    },
    [],
  );
  async function addFiles(selected: File[]) {
    const generation = ++fileGeneration.current;
    if (
      files.length + selected.length > 5 ||
      selected.some(
        (file) =>
          file.size > 4_000_000 ||
          !/\.(txt|md|csv|json|pdf|docx)$/i.test(file.name),
      )
    ) {
      setError(label("fileError"));
      return;
    }
    setReading(true);
    setError("");
    try {
      const additions = await Promise.all(
        selected.map(
          (file) =>
            new Promise<WorkspaceFile>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error(label("fileError")));
              reader.onload = () =>
                resolve({
                  name: file.name,
                  size: file.size,
                  mime_type: file.type || "text/plain",
                  data: String(reader.result).split(",")[1],
                });
              reader.readAsDataURL(file);
            }),
        ),
      );
      if (generation === fileGeneration.current)
        setFiles((previous) => [...previous, ...additions]);
    } catch (caught) {
      if (generation === fileGeneration.current)
        setError(caught instanceof Error ? caught.message : label("fileError"));
    } finally {
      if (generation === fileGeneration.current) setReading(false);
    }
  }
  async function submit() {
    if (submitLock.current || reading) return;
    if (!name.trim() || name.trim().length > 100) {
      setInvalidName(true);
      setError(label("invalidName"));
      input.current?.focus();
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const project =
        createdProject ||
        (await request<WorkspaceProject>("projects", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            ...appearance,
            instructions: instructions.trim(),
            files,
          }),
        }));
      setCreatedProject(project);
      if (moveChatId)
        await request(`conversations/${moveChatId}`, {
          method: "PATCH",
          body: JSON.stringify({ projectId: project.id }),
        });
      await refresh();
      notify(label("saved"), "success");
      onCreated(project);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : label("loadError"));
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={label("createProject")}
      onClose={() => {
        if (!busy && !reading) onClose();
      }}
    >
      <form
        className="ws-project-create-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="workspace-project-name">{label("projectName")}</label>
        <div className="ws-project-name-field">
          <ProjectIconPicker
            icon={appearance.icon}
            color={appearance.color}
            onChange={setAppearance}
            label={label("projectIcon")}
            searchLabel={label("searchIcons")}
            clearLabel={label("clear")}
            disabled={busy || Boolean(createdProject)}
          />
          <input
            ref={input}
            id="workspace-project-name"
            value={name}
            maxLength={100}
            placeholder={label("projectNamePlaceholder")}
            aria-invalid={invalidName}
            aria-describedby={invalidName ? "workspace-project-error" : undefined}
            onChange={(event) => {
              setName(event.target.value);
              setInvalidName(false);
            }}
            disabled={busy || Boolean(createdProject)}
            autoComplete="off"
          />
        </div>
        <label htmlFor="workspace-project-instructions">
          {label("instructions")}
        </label>
        <textarea
          className="resize-none"
          id="workspace-project-instructions"
          value={instructions}
          maxLength={8000}
          rows={5}
          onChange={(event) => setInstructions(event.target.value)}
          disabled={busy || Boolean(createdProject)}
        />
        <label htmlFor="workspace-project-files">{label("files")}</label>
        <input
          id="workspace-project-files"
          type="file"
          accept=".txt,.md,.csv,.json,.pdf,.docx"
          multiple
          disabled={busy || reading || Boolean(createdProject)}
          onChange={(event) => {
            void addFiles(Array.from(event.target.files || []));
            event.target.value = "";
          }}
        />
        {files.length > 0 && (
          <ul className="ws-project-file-list">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <WorkspaceIcon name="file" size={15} />
                <span>{file.name}</span>
                <WorkspaceTooltip
                  label={`${label("removeFile")}: ${file.name}`}
                  side="bottom"
                >
                  <button
                    type="button"
                    className="ws-btn ws-sidebar-icon"
                    aria-label={`${label("removeFile")}: ${file.name}`}
                    disabled={busy || Boolean(createdProject)}
                    onClick={() =>
                      setFiles(files.filter((_, entry) => entry !== index))
                    }
                  >
                    <WorkspaceIcon name="close" size={14} />
                  </button>
                </WorkspaceTooltip>
              </li>
            ))}
          </ul>
        )}
        {reading && <p role="status">{label("fileReading")}</p>}
        {error && (
          <p
            id="workspace-project-error"
            role="alert"
            className="ws-inline-error"
          >
            {error}
          </p>
        )}
        <div className="ws-dialog-actions">
          <button
            type="button"
            className="ws-btn"
            disabled={busy || reading}
            onClick={onClose}
          >
            {label("cancel")}
          </button>
          <button
            type="submit"
            className="ws-btn ws-sidebar-primary"
            disabled={busy || reading}
            aria-busy={busy}
          >
            {label(createdProject ? "retry" : "create")}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
