export interface WorkspaceFile {
  id?: number | string;
  name: string;
  mime_type?: string;
  size?: number;
  data?: string;
  extracted_text?: string;
}
export interface WorkspaceConversation {
  id: number;
  /** URL key (/c/<uuid>); the numeric id never appears in the address bar. */
  publicId?: string | null;
  title: string;
  projectId: number | null;
  pinnedAt?: string | null;
  archivedAt?: string | null;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  titleSource?: string;
  titleVersion?: number;
  titleStatus?: string;
  presetId?: number | null;
}
export interface WorkspaceProject {
  id: number;
  name: string;
  instructions?: string | null;
  files?: WorkspaceFile[];
  pinnedAt?: string | null;
  presetId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface WorkspacePreferences {
  grouping: "projects" | "list";
  sort: "activity" | "name";
  showProjects: boolean;
  timezone: string;
  libraryView: "grid" | "list";
  timezoneInitialized?: boolean;
}
export interface WorkspaceSnapshot {
  conversations: WorkspaceConversation[];
  projects: WorkspaceProject[];
  preferences: WorkspacePreferences;
  capabilities: Record<string, unknown>;
  hasMoreConversations?: boolean;
}
export interface WorkspaceLibraryItem {
  id: number;
  name: string;
  type: "document" | "image" | "video";
  url?: string | null;
  content?: string | null;
  isFavorite?: boolean;
  folderId?: number | null;
  sourceMessageId?: number | null;
  createdAt: string;
}
export interface WorkspaceFolder { id: number; name: string; }
export interface WorkspacePreset {
  id: number;
  name: string;
  description?: string;
  instructions: string;
  version: number;
  isPublic?: boolean;
  model?: string;
}

export const WORKSPACE_SIGN_IN_MESSAGE = "Sign in to use your workspace";
export const isWorkspaceSignInError = (message: string) => message === WORKSPACE_SIGN_IN_MESSAGE;

export async function workspaceRequest<T = unknown>(path = "", init: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (!token) throw new Error(WORKSPACE_SIGN_IN_MESSAGE);
  const response = await fetch(`/api/chat/workspace${path ? `/${path.replace(/^\//, "")}` : ""}`, {
    ...init,
    headers: { ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}`, ...init.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || `Request failed (${response.status})`);
  return data as T;
}
