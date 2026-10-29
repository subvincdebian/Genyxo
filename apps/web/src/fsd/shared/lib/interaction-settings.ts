import { VOICE_OPTIONS } from "./voice-catalog";
export type Shortcut = { binding: string; enabled: boolean };
export const SHORTCUTS = [
  {
    id: "focus",
    title: "Focus message editor",
    group: "Message editor",
    binding: "Shift+Escape",
  },
  {
    id: "send",
    title: "Send message",
    group: "Message editor",
    binding: "Enter",
  },
  {
    id: "backgroundSend",
    title: "Send message in background",
    group: "Message editor",
    binding: "Ctrl+Enter",
  },
  {
    id: "effort",
    title: "Choose AI model",
    group: "Message editor",
    binding: "Ctrl+Shift+KeyM",
  },
  {
    id: "attach",
    title: "Attach files",
    group: "Message editor",
    binding: "Ctrl+KeyU",
  },
  {
    id: "delete",
    title: "Delete current chat",
    group: "Chat",
    binding: "Ctrl+Shift+Delete",
  },
  {
    id: "new",
    title: "New chat",
    group: "Application",
    binding: "Ctrl+Shift+KeyO",
  },
  {
    id: "help",
    title: "Show keyboard shortcuts",
    group: "Application",
    binding: "Ctrl+Slash",
  },
  {
    id: "search",
    title: "Search chats",
    group: "Application",
    binding: "Ctrl+KeyK",
  },
  {
    id: "sidebar",
    title: "Toggle sidebar",
    group: "Application",
    binding: "Ctrl+Shift+KeyS",
  },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `recent${i + 1}`,
    title: `Recent chat ${i + 1}`,
    group: "Recent chats",
    binding: `Alt+Digit${i + 1}`,
  })),
];
export const CALL_LANGUAGES = [
  ["auto", "Autodetection"],
  ["en", "English"],
  ["uk", "Українська"],
  ["es", "Español"],
  ["de", "Deutsch"],
  ["fr", "Français"],
  ["it", "Italiano"],
  ["pt", "Português"],
  ["pl", "Polski"],
  ["ja", "日本語"],
  ["ko", "한국어"],
  ["zh", "中文"],
  ["ar", "العربية"],
  ["hi", "हिन्दी"],
  ["tr", "Türkçe"],
  ["nl", "Nederlands"],
  ["sv", "Svenska"],
  ["cs", "Čeština"],
  ["ro", "Română"],
  ["id", "Bahasa Indonesia"],
  ["vi", "Tiếng Việt"],
] as const;
export type InteractionSettings = {
  voice: string;
  callLanguage: string;
  dictationEnabled: boolean;
  shortcuts: Record<string, Shortcut>;
};
export const DEFAULT_INTERACTIONS: InteractionSettings = {
  voice: "Kore",
  callLanguage: "auto",
  dictationEnabled: true,
  shortcuts: Object.fromEntries(
    SHORTCUTS.map((item) => [
      item.id,
      { binding: item.binding, enabled: true },
    ]),
  ),
};
const defaults = { settings: DEFAULT_INTERACTIONS, saving: false, error: "" };
let snapshot = defaults;
let owner = "";
let initialized = "";
let revision = 0;
let queue = Promise.resolve();
let unsynced: Partial<InteractionSettings> = {};
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
export const subscribeInteractions = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getInteractions = () => snapshot;
export const getServerInteractions = () => defaults;
function merge(value: Partial<InteractionSettings>): InteractionSettings {
  const shortcuts = { ...DEFAULT_INTERACTIONS.shortcuts };
  for (const item of SHORTCUTS) {
    const shortcut = value?.shortcuts?.[item.id];
    if (
      shortcut &&
      typeof shortcut.binding === "string" &&
      typeof shortcut.enabled === "boolean"
    )
      shortcuts[item.id] = shortcut;
  }
  return {
    voice: VOICE_OPTIONS.some((item) => item.name === value?.voice)
      ? value.voice!
      : "Kore",
    callLanguage: CALL_LANGUAGES.some(([key]) => key === value?.callLanguage)
      ? value.callLanguage!
      : "auto",
    dictationEnabled:
      typeof value?.dictationEnabled === "boolean"
        ? value.dictationEnabled
        : true,
    shortcuts,
  };
}
function cache() {
  try {
    localStorage.setItem(
      `genyxo.interactions:${owner}`,
      JSON.stringify(snapshot.settings),
    );
  } catch {
    /* browser storage is optional */
  }
}
function tokenOwner(token: string) {
  try {
    return String(
      JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ).sub,
    );
  } catch {
    return "guest";
  }
}
async function request(token: string, patch?: Partial<InteractionSettings>) {
  const response = await fetch("/api/profile/interaction-settings", {
    method: patch ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(patch ? { "Content-Type": "application/json" } : {}),
    },
    ...(patch ? { body: JSON.stringify(patch) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Settings could not be synced. Try again.");
  return response.json() as Promise<Partial<InteractionSettings>>;
}
export async function hydrateInteractions() {
  const token = localStorage.getItem("authToken") || "";
  if (initialized === token) return;
  initialized = token;
  owner = tokenOwner(token);
  revision++;
  unsynced = {};
  let cached: Partial<InteractionSettings> = {};
  try {
    const parsed = JSON.parse(
      localStorage.getItem(`genyxo.interactions:${owner}`) || "{}",
    );
    cached = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    /* use defaults */
  }
  // Preserve the voice picked in the existing chat UI on the first migration.
  if (!cached.voice)
    cached.voice = localStorage.getItem("genyxo.voice") || "Kore";
  snapshot = { settings: merge(cached), saving: false, error: "" };
  notify();
  if (!token) return;
  const started = revision;
  try {
    const remote = await request(token);
    if (started === revision && initialized === token) {
      snapshot = {
        ...snapshot,
        settings: merge({ ...snapshot.settings, ...remote }),
      };
      cache();
      notify();
    }
  } catch {
    if (started === revision && initialized === token) {
      initialized = "";
      snapshot = {
        ...snapshot,
        error: "Settings could not be synced. Try again.",
      };
      notify();
    }
  }
}
export function receiveInteractionStorage(event: StorageEvent) {
  if (
    event.key !== `genyxo.interactions:${owner}` ||
    !event.newValue ||
    snapshot.saving
  )
    return;
  try {
    snapshot = {
      settings: merge(JSON.parse(event.newValue)),
      saving: false,
      error: "",
    };
    revision++;
    notify();
  } catch {
    /* ignore damaged storage */
  }
}
export function receiveRemoteInteractions(
  userId: number,
  settings: Partial<InteractionSettings>,
) {
  if (String(userId) !== owner || !settings || typeof settings !== "object")
    return;
  if (!snapshot.saving) revision++;
  snapshot = {
    ...snapshot,
    settings: merge({
      ...snapshot.settings,
      ...settings,
      ...unsynced,
      shortcuts: {
        ...snapshot.settings.shortcuts,
        ...settings.shortcuts,
        ...unsynced.shortcuts,
      },
    }),
  };
  cache();
  notify();
}
export async function refreshRemoteInteractions() {
  const token = localStorage.getItem("authToken") || "";
  if (!token) return;
  const started = revision;
  try {
    const settings = await request(token);
    if (started === revision && token === localStorage.getItem("authToken"))
      receiveRemoteInteractions(Number(owner), settings);
  } catch {
    /* cached settings remain usable while the connection recovers */
  }
}
export function updateInteractions(patch: Partial<InteractionSettings>) {
  revision++;
  unsynced = {
    ...unsynced,
    ...patch,
    ...(patch.shortcuts
      ? { shortcuts: { ...unsynced.shortcuts, ...patch.shortcuts } }
      : {}),
  };
  snapshot = {
    settings: merge({
      ...snapshot.settings,
      ...patch,
      shortcuts: { ...snapshot.settings.shortcuts, ...patch.shortcuts },
    }),
    saving: true,
    error: "",
  };
  cache();
  notify();
  const token = localStorage.getItem("authToken") || "";
  const pending = revision;
  queue = queue
    .catch(() => {})
    .then(async () => {
      if (token !== (localStorage.getItem("authToken") || "")) return;
      const outgoing = unsynced;
      try {
        if (!token) throw new Error("Sign in to save settings.");
        await request(token, outgoing);
        if (unsynced === outgoing) unsynced = {};
        if (pending === revision)
          snapshot = { ...snapshot, saving: false, error: "" };
      } catch (error) {
        if (pending === revision)
          snapshot = {
            ...snapshot,
            saving: false,
            error:
              error instanceof Error
                ? error.message
                : "Could not save settings.",
          };
      }
      notify();
    });
  return queue;
}
export function shortcutBinding(
  event: Pick<
    KeyboardEvent,
    "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"
  >,
) {
  return `${event.ctrlKey || event.metaKey ? "Ctrl+" : ""}${event.altKey ? "Alt+" : ""}${event.shiftKey ? "Shift+" : ""}${event.code}`;
}
export function matchesShortcut(event: KeyboardEvent, id: string) {
  const value = snapshot.settings.shortcuts[id];
  return (
    !event.isComposing &&
    !event.repeat &&
    Boolean(value?.enabled && value.binding === shortcutBinding(event))
  );
}
export const formatBinding = (binding: string) =>
  binding
    .replace(/Key|Digit/g, "")
    .replace("Escape", "Esc")
    .replace("Slash", "/")
    .replace("Space", "Space");
