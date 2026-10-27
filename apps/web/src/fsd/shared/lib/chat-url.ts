/**
 * Chat URLs carry an unguessable key, /c/<uuid>, as in ChatGPT; the numeric
 * id stays internal to API calls. The API resolves a key only for the chat's
 * owner, so a guessed or shared key opens nothing for anyone else.
 */
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const keys = new Map<number, string>();
const ids = new Map<string, number>();

type Keyed = { id: number; publicId?: string | null };

function remember(id: number, key: string) {
  keys.set(id, key.toLowerCase());
  ids.set(key.toLowerCase(), id);
}

/** Caches the keys that arrive with the chat list. */
export function rememberChatKeys(chats: Keyed[]) {
  chats.forEach((chat) => { if (chat.publicId && KEY.test(chat.publicId)) remember(chat.id, chat.publicId); });
}

/** True for /chat and /c/<key>: the routes that show the conversation. */
export function isChatPath(pathname: string | null | undefined) {
  return pathname === "/chat" || Boolean(pathname?.startsWith("/c/"));
}

/** The key in a /c/<key> path, or null. */
export function chatKeyFromPath(pathname: string) {
  const key = /^\/c\/([^/?#]+)\/?$/.exec(pathname)?.[1] || "";
  return KEY.test(key) ? key.toLowerCase() : null;
}

/** The id of the chat open in the address bar, when its key is already known. */
export function openChatId() {
  const key = chatKeyFromPath(window.location.pathname);
  return key ? ids.get(key) : undefined;
}

/** The cached /c/<key> path of a chat, or null while its key is unknown. */
export function cachedChatPath(id: number) {
  const key = keys.get(id);
  return key ? `/c/${key}` : null;
}

async function request<T>(path: string): Promise<T | null> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (!token) return null;
  const response = await fetch(`/api/chat/workspace/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return response.ok ? (response.json() as Promise<T>) : null;
}

/** The /c/<key> path of one of the user's chats, fetched once if not cached. */
export async function chatPath(id: number) {
  const cached = cachedChatPath(id);
  if (cached) return cached;
  const found = await request<{ id: number; publicId: string }>(`conversations/${id}/key`).catch(() => null);
  if (!found?.publicId) return null;
  remember(found.id, found.publicId);
  return `/c/${found.publicId}`;
}

/** The id behind a key, or null when it is not the signed-in user's chat. */
export async function resolveChatKey(key: string) {
  const normalized = key.toLowerCase();
  const cached = ids.get(normalized);
  if (cached) return { id: cached, projectId: null as number | null };
  if (!KEY.test(normalized)) return null;
  const found = await request<{ id: number; publicId: string; projectId: number | null }>(`conversations/key/${normalized}`).catch(() => null);
  if (!found) return null;
  remember(found.id, found.publicId);
  return { id: found.id, projectId: found.projectId };
}
