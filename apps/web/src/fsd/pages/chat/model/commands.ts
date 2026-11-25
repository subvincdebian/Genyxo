/**
 * Everything the command palette and keyboard shortcuts can do. Each command
 * names its shortcut (when it has one) so the palette shows the same keys the
 * Keyboard settings page lets people change.
 */
export type CommandId =
  | "new" | "sidebar" | "help" | "settings" | "instructions" | "focus" | "attach" | "effort"
  | "dictate" | "voice" | "stop" | "regenerate" | "copyLast" | "copyCode" | "editLast" | "readAloud"
  | "delete" | "prevChat" | "nextChat" | "web" | "research" | "agent"
  | "library" | "plugins" | "scheduled" | "maps" | "skills" | "projects";

export type Command = {
  id: CommandId;
  title: string;
  hint?: string;
  icon: string;
  keywords?: string;
  /** Shown in the empty palette. */
  suggested?: boolean;
  /** Needs an open chat with answers. */
  chat?: boolean;
};

export const COMMANDS: Command[] = [
  { id: "new", title: "New chat", icon: "new", keywords: "start fresh conversation create", suggested: true },
  { id: "effort", title: "Change model", hint: "Pick another AI model", icon: "cube", keywords: "model switch gpt claude gemini choose ai", suggested: true },
  { id: "voice", title: "Start voice conversation", hint: "Talk, show your screen or camera", icon: "mic", keywords: "call speak live talk camera screen share", suggested: true },
  { id: "web", title: "Search the web", hint: "For the next message", icon: "globe", keywords: "internet browse online mode", suggested: true },
  { id: "research", title: "Deep research", hint: "A detailed report with sources", icon: "search", keywords: "report sources investigate mode" },
  { id: "agent", title: "Agent mode", hint: "Plans and does the task, asks before sending", icon: "bolt", keywords: "automate operator task browse mode" },
  { id: "skills", title: "Use a skill", hint: "Apply saved instructions to the next message", icon: "sparkles", keywords: "preset skill template prompt run" },
  { id: "projects", title: "Open a project", icon: "folder", keywords: "project folder workspace knowledge" },
  { id: "attach", title: "Attach files", icon: "upload", keywords: "upload file image pdf document photo" },
  { id: "dictate", title: "Dictate", hint: "Speak instead of typing", icon: "mic", keywords: "voice typing speech to text microphone" },
  { id: "focus", title: "Focus message editor", icon: "edit", keywords: "type input composer write" },
  { id: "regenerate", title: "Regenerate response", icon: "restore", keywords: "retry again redo answer", chat: true },
  { id: "copyLast", title: "Copy last response", icon: "copy", keywords: "clipboard answer", chat: true },
  { id: "copyCode", title: "Copy last code block", icon: "code", keywords: "clipboard snippet", chat: true },
  { id: "editLast", title: "Edit last message", icon: "edit", keywords: "change fix prompt question", chat: true },
  { id: "readAloud", title: "Read last answer aloud", icon: "volume", keywords: "speak listen tts", chat: true },
  { id: "stop", title: "Stop generating", icon: "stop", keywords: "cancel halt abort", chat: true },
  { id: "delete", title: "Delete current chat", icon: "trash", keywords: "remove conversation", chat: true },
  { id: "prevChat", title: "Previous chat", icon: "arrow-up", keywords: "back up navigate" },
  { id: "nextChat", title: "Next chat", icon: "arrow-down", keywords: "forward down navigate" },
  { id: "sidebar", title: "Toggle sidebar", icon: "panel", keywords: "hide show navigation collapse" },
  { id: "library", title: "Open Library", icon: "library", keywords: "documents images files saved" },
  { id: "scheduled", title: "Open Scheduled tasks", icon: "clock", keywords: "reminders tasks automations" },
  { id: "plugins", title: "Open Plugins", icon: "plugins", keywords: "integrations connectors mcp skills apps" },
  { id: "maps", title: "Open Maps", icon: "maps", keywords: "places routes map directions" },
  { id: "instructions", title: "Custom instructions", icon: "sparkles", keywords: "personalization prompt about me style memory" },
  { id: "settings", title: "Open settings", icon: "settings", keywords: "preferences profile account options", suggested: true },
  { id: "help", title: "Keyboard shortcuts", icon: "grid", keywords: "hotkeys keys bindings help" },
];

/** Settings sections the palette can open directly. */
export const SETTING_PAGES = [
  { id: "general", title: "General", icon: "settings", keywords: "language font send key animations" },
  { id: "profile", title: "Profile", icon: "user", keywords: "name email photo avatar" },
  { id: "personalization", title: "Personalization", icon: "sparkles", keywords: "custom instructions memory response language time zone" },
  { id: "pets", title: "Pets", icon: "heart", keywords: "companion pet size" },
  { id: "appearance", title: "Appearance", icon: "settings", keywords: "theme dark light mode accent colors" },
  { id: "notifications", title: "Notifications", icon: "bell", keywords: "email push alerts" },
  { id: "security", title: "Security", icon: "lock", keywords: "password sessions devices two factor sign in" },
  { id: "voice", title: "Voice", icon: "mic", keywords: "microphone speaker voice language call" },
  { id: "keyboard", title: "Keyboard", icon: "grid", keywords: "shortcuts hotkeys bindings" },
  { id: "archive", title: "Archived chats", icon: "archive", keywords: "archive restore old" },
  { id: "billing", title: "Credits & billing", icon: "wallet", keywords: "credits balance payment top up invoice" },
  { id: "usage", title: "Usage", icon: "chart", keywords: "statistics activity models spent" },
  { id: "referrals", title: "Referrals", icon: "branch", keywords: "invite friends bonus" },
];

/**
 * How well `text` matches every word of the query: 0 when a word is missing,
 * more for matches at the start of the title or of a word.
 */
export function matchScore(query: string, title: string, extra = "") {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const head = title.toLocaleLowerCase();
  const all = `${head} ${extra.toLocaleLowerCase()}`;
  let score = 0;
  for (const word of words) {
    const at = all.indexOf(word);
    if (at < 0) return 0;
    score += head.startsWith(word) ? 6 : head.includes(` ${word}`) ? 4 : at < head.length ? 3 : 1;
  }
  return score;
}

export const modelIcon = (value = "") =>
  value === "auto" ? "/images/auto-route.svg"
  : value.includes("dall-e") ? "/images/dalle-text.png"
  : /flux|leonardo/.test(value) ? "/images/model-image.svg"
  : /mistral|glm|granite|flint|lfm|minimax|stepfun|openrouter\/free/.test(value) ? "/images/model-open.svg"
  : value.includes("qwen") ? "/images/qwen-icon.svg"
  : value.includes("llama") || value.includes("/meta/") ? "/images/meta-icon.svg"
  : value.includes("google/") || value.includes("gemma") ? "/images/google-gemini.svg"
  : value.includes("openai") || value.includes("gpt") ? "/images/openai-mark.svg"
  : value.includes("anthropic") || value.includes("claude") ? "/images/claude-ai.svg"
  : value.includes("nvidia/") ? "/images/nvidia-icon.svg"
  : value.includes("kling") ? "/images/kling-video.svg"
  : "/images/logo.svg";
