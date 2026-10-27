"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useGeneratingChats } from "./generating-chats";
import { workspaceRequest, type WorkspaceConversation, type WorkspacePreferences, type WorkspaceProject, type WorkspaceSnapshot } from "./types";

const defaults: WorkspacePreferences = { grouping: "projects", sort: "activity", showProjects: true, timezone: "UTC", libraryView: "grid" };
type Tone = "success" | "error" | "info";
interface WorkspaceContextValue {
  conversations: WorkspaceConversation[];
  projects: WorkspaceProject[];
  preferences: WorkspacePreferences;
  capabilities: Record<string, unknown>;
  userId: number | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  request: typeof workspaceRequest;
  notify: (message: string, type?: Tone) => void;
  activeProjectId: number | null;
  setActiveProjectId: (id: number | null) => void;
  selectedChatId: number | null;
  selectChat: (id: number) => void;
  startNewChat: (projectId?: number) => void;
  openProject: (id: number) => void;
  conversationHasMore: boolean;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  /** Chats whose reply is still generating, possibly started on another page. */
  generatingIds: number[];
  /** Chats with an answer that arrived while the user was elsewhere. */
  unreadIds: number[];
}
const Context = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>({ conversations: [], projects: [], preferences: defaults, capabilities: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [activeProjectId, setProjectState] = useState<number | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationHasMore, setConversationHasMore] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const count = useRef(50);
  const paging = useRef(false);
  const selected = useRef<number | null>(null);
  const setActiveProjectId = useCallback((id: number | null) => {
    setProjectState(id);
    document.dispatchEvent(new CustomEvent("genyxo:workspace-active-project", { detail: { projectId: id } }));
  }, []);
  const notify = useCallback((message: string, type: Tone = "info") => {
    document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));
  }, []);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const result = await workspaceRequest<WorkspaceSnapshot>();
      if (!mounted.current || generation.current !== current) return;
      if (!Array.isArray(result.conversations) || !Array.isArray(result.projects)) throw new Error("Unable to load your workspace. Please retry.");
      let hasMore = Boolean(result.hasMoreConversations);
      while (result.conversations.length < count.current && hasMore) {
        const page = await workspaceRequest<{ items: WorkspaceConversation[]; hasMore: boolean }>(`conversations?offset=${result.conversations.length}&limit=50`);
        if (!page.items.length) break;
        result.conversations.push(...page.items);
        hasMore = page.hasMore;
      }
      if (generation.current !== current || !mounted.current) return;
      if (result.preferences?.timezoneInitialized === false) {
        result.preferences = await workspaceRequest<WorkspacePreferences>("preferences", { method: "PATCH", body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
      }
      if (generation.current !== current || !mounted.current) return;
      setSnapshot({ ...result, preferences: { ...defaults, ...result.preferences }, capabilities: result.capabilities || {} });
      setConversationHasMore(hasMore);
      document.dispatchEvent(new CustomEvent("genyxo:workspace-data", { detail: result }));
      if (selected.current) {
        const chat = result.conversations.find((item) => item.id === selected.current);
        if (chat) setActiveProjectId(chat.projectId || null);
      }
      setError("");
    } catch (caught) {
      if (mounted.current && generation.current === current) setError(caught instanceof Error ? caught.message : "Unable to load workspace");
    } finally {
      if (mounted.current && generation.current === current) setLoading(false);
    }
  }, [setActiveProjectId]);
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => {
      if (!mounted.current) return;
      try {
        const encoded = localStorage.getItem("authToken")?.split(".")[1];
        if (encoded) { const payload = JSON.parse(atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))); setUserId(Number(payload.id || payload.sub) || null); }
      } catch { /* Identity is still verified by the API; storage personalization is optional. */ }
      selected.current = Number(new URL(location.href).searchParams.get("id")) || null;
      setSelectedChatId(selected.current);
      void refresh();
    });
    const updated = () => { void refresh(); };
    const state = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      // URL-restored chats publish their id as a string; rows compare numbers.
      selected.current = Number(detail.conversationId) || null;
      setSelectedChatId(selected.current);
      setProjectState(detail.projectId || null);
    };
    document.addEventListener("genyxo:workspace-refresh", updated);
    document.addEventListener("genyxo:chat-state", state);
    window.addEventListener("focus", updated);
    return () => {
      mounted.current = false;
      document.removeEventListener("genyxo:workspace-refresh", updated);
      document.removeEventListener("genyxo:chat-state", state);
      window.removeEventListener("focus", updated);
    };
  }, [refresh]);
  const hasPendingTitles = snapshot.conversations.some((item) => ["queued", "running"].includes(item.titleStatus || ""));
  useEffect(() => {
    if (!hasPendingTitles) return;
    let attempts = 0;
    const timer = setInterval(() => { if (++attempts > 60) { clearInterval(timer); return; } void refresh(); }, 2000);
    return () => clearInterval(timer);
  }, [hasPendingTitles, refresh]);
  const loadMore = useCallback(async () => {
    if (paging.current || !conversationHasMore) return;
    paging.current = true; setLoadingMore(true);
    try {
      const page = await workspaceRequest<{ items: WorkspaceConversation[]; hasMore: boolean }>(`conversations?offset=${snapshot.conversations.length}&limit=50`);
      setSnapshot((previous) => ({ ...previous, conversations: [...previous.conversations, ...page.items.filter((item) => !previous.conversations.some((existing) => existing.id === item.id))] }));
      count.current = snapshot.conversations.length + page.items.length;
      setConversationHasMore(page.hasMore);
    } catch (caught) { notify(caught instanceof Error ? caught.message : "Unable to load older chats", "error"); }
    finally { paging.current = false; setLoadingMore(false); }
  }, [snapshot.conversations, conversationHasMore, notify]);
  const selectChat = useCallback((id: number) => {
    const projectId = snapshot.conversations.find((item) => item.id === id)?.projectId || null;
    selected.current = id;
    setSelectedChatId(id); setActiveProjectId(projectId);
    document.dispatchEvent(new CustomEvent("genyxo:workspace-select", { detail: { id, projectId } }));
    router.push(`/chat?id=${id}`);
  }, [router, snapshot.conversations, setActiveProjectId]);
  const startNewChat = useCallback((projectId?: number) => {
    selected.current = null; setSelectedChatId(null); setActiveProjectId(projectId || null);
    document.dispatchEvent(new CustomEvent("genyxo:workspace-new", { detail: { projectId: projectId || null } }));
    router.push("/chat");
  }, [router, setActiveProjectId]);
  const openProject = useCallback((id: number) => {
    document.dispatchEvent(new CustomEvent("genyxo:workspace-project", { detail: { id } }));
  }, []);
  const refreshQuietly = useCallback(() => { void refresh(); }, [refresh]);
  const generatingIds = useGeneratingChats(userId !== null, refreshQuietly);
  const [unreadIds, setUnreadIds] = useState<number[]>([]);
  useEffect(() => {
    const unread = (event: Event) => { const id = Number((event as CustomEvent<{ id: number }>).detail?.id); if (id) setUnreadIds((list) => (list.includes(id) ? list : [...list, id])); };
    document.addEventListener("genyxo:reply-unread", unread);
    return () => document.removeEventListener("genyxo:reply-unread", unread);
  }, []);
  // Opening a chat reads its new answer.
  useEffect(() => { if (selectedChatId !== null) queueMicrotask(() => setUnreadIds((list) => (list.includes(selectedChatId) ? list.filter((id) => id !== selectedChatId) : list))); }, [selectedChatId]);
  return <Context.Provider value={{ ...snapshot, loading, error, refresh, request: workspaceRequest, notify, userId, activeProjectId, setActiveProjectId, selectedChatId, selectChat, startNewChat, openProject, conversationHasMore, loadingMore, loadMore, generatingIds, unreadIds }}>{children}</Context.Provider>;
}
export function useWorkspace() { const value = useContext(Context); if (!value) throw new Error("WorkspaceProvider is missing"); return value; }
