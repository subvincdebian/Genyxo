"use client";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useSavedPlaces, useWorkspace, workspaceRequest } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { PluginLogo } from "@/shared/ui/plugin-logos";
import { SketchDialog } from "./SketchDialog";
import { ComposerPalette, optionId, PALETTE_ID, type PaletteEntry, type PaletteSection } from "./ComposerPalette";
import { COMPOSER_VALUE_EVENT, ComposerSurface } from "./ComposerSurface";
import { draftKey, findTrigger, mentionRanges, pruneDrafts, readDraft, writeDraft, type MentionChip } from "../model/composer-drafts";

type LibraryItem = { id: number; name: string; type: "document" | "image" | "video"; url?: string; content?: string };
type Preset = { id: number; name: string; description?: string };
type Plugin = { id: string; name: string; description: string; status: string };
type Mode = "plus" | "mention" | "slash";
type Page = "root" | "library" | "project" | "skill" | "plugin" | "model";
/** start is where the "@" or "/" sits in the textarea; the "+" menu has none. */
type Menu = { mode: Mode; page: Page; start: number };

const ACCEPT = "image/*,.pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.cs,.go,.rs,.php,.rb,.swift,.kt,.sql,.sh,.yaml,.yml,text/*";
/** "+" menu modes for the next message, shown as a chip beside "+" like ChatGPT. */
type ChatMode = "search" | "research";
const TELESCOPE = "M3.2 9.6 13.9 4.1l1.6 3.1-10.7 5.5-1.6-3.1Zm11.4-6 2.2-1.1 2.3 4.4-2.2 1.1-2.3-4.4ZM8.6 11.6l1.6 1.3-2.3 4.6H6.3l2.3-5.9Zm2.9.2 2.6 5.7h-1.6l-2.3-4.4 1.3-1.3Z";
const MODES: Record<ChatMode, { title: string; placeholder: string }> = {
  search: { title: "Web search", placeholder: "Search the web…" },
  research: { title: "Deep research", placeholder: "What should I research?" },
};
const modeIcon = (mode: ChatMode, size = 18) => mode === "search"
  ? <WorkspaceIcon name="globe" size={size} />
  : <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d={TELESCOPE} /></svg>;
const PAGE_TITLES: Record<Exclude<Page, "root">, string> = { library: "Library", project: "Projects", skill: "Skills", plugin: "Plugins", model: "Model" };

const composerInput = () => document.getElementById("userInput") as HTMLTextAreaElement | null;
const notify = (message: string, type = "info") => document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));
const mentionHref = (chip: MentionChip) => chip.kind === "plugin" ? `/plugins/${encodeURIComponent(chip.id)}` : "/plugins?tab=skills";
const openMention = (chip: MentionChip, push: (href: string) => void) => {
  if (chip.kind === "place") window.open(`https://maps.apple.com/?ll=${chip.lat},${chip.lng}&q=${encodeURIComponent(chip.name)}`, "_blank", "noopener,noreferrer");
  else push(mentionHref(chip));
};

/** Hands files to the chat controller's existing attachment pipeline. */
function attachFiles(files: File[]) {
  const input = document.getElementById("fileInput") as HTMLInputElement | null;
  if (!input || !files.length) return;
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  composerInput()?.focus();
}

function switchModel(value: string, placeholder?: string) {
  const select = document.getElementById("modelSelect") as HTMLSelectElement | null;
  if (select) { select.value = value; select.dispatchEvent(new Event("change")); }
  const input = composerInput();
  if (input && placeholder) input.placeholder = placeholder;
}

function readModels() {
  const select = document.getElementById("modelSelect") as HTMLSelectElement | null;
  if (!select) return { current: "", models: [] as { value: string; label: string }[] };
  const models = Array.from(select.options)
    .filter((option) => option.value && !/embedding|robotics|audio|live-translate/.test(option.value))
    .map((option) => ({ value: option.value, label: option.textContent?.trim() || option.value }));
  return { current: select.value, models };
}

const loadPresets = () => workspaceRequest<{ items: Preset[] }>("presets").then((data) => data.items || []);
const loadLibrary = () => workspaceRequest<{ items: LibraryItem[] }>("library?tab=all&sort=date").then((data) => (data.items || []).filter((item) => item.type !== "video"));
async function loadPlugins(): Promise<Plugin[]> {
  const token = localStorage.getItem("authToken");
  if (!token) return [];
  const response = await fetch("/api/integrations", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Plugins could not be loaded");
  const data = await response.json() as { plugins?: Plugin[] };
  return (data.plugins || []).filter((plugin) => plugin.status === "connected" || plugin.status === "expired");
}

// Reloads on every open so the lists stay current; the previous result shows meanwhile.
function useList<T>(load: () => Promise<T[]>, enabled: boolean) {
  const [items, setItems] = useState<T[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    load().then((result) => { if (live) setItems(result); }).catch(() => { if (live) setItems((current) => current ?? []); });
    return () => { live = false; };
  }, [load, enabled]);
  return items;
}

export function ComposerPlusMenu({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const { projects, activeProjectId, setActiveProjectId, startNewChat, selectedChatId, userId } = useWorkspace();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mentions, setMentions] = useState<MentionChip[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  const modeRef = useRef<ChatMode | null>(null);
  useLayoutEffect(() => { modeRef.current = chatMode; }, [chatMode]);
  // The placeholder says what the next message will do.
  const basePlaceholder = useRef<string | null>(null);
  useEffect(() => {
    const input = composerInput();
    if (!input) return;
    basePlaceholder.current ??= input.placeholder;
    input.placeholder = chatMode ? MODES[chatMode].placeholder : basePlaceholder.current || "Message Genyxo...";
  }, [chatMode]);
  const toggleMode = (mode: ChatMode) => setChatMode((current) => (current === mode ? null : mode));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sketch, setSketch] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [form, setForm] = useState<HTMLFormElement | null>(null);
  const plusButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  // The "@" or "/" the user closed with Escape stays closed until it is retyped.
  const dismissed = useRef<number | null>(null);

  const open = Boolean(menu) && !closing;
  const presets = useList(loadPresets, open);
  const plugins = useList(loadPlugins, open);
  // Typing in the "+" or "@" search also looks through the Library, not only its page.
  // Starred map places, mentioned as "@Home" with their address and coordinates.
  const savedPlaces = useSavedPlaces(open);
  const library = useList(loadLibrary, open && (menu?.page === "library" || (menu?.page === "root" && menu.mode !== "slash" && Boolean(query.trim()))));

  useEffect(() => {
    queueMicrotask(() => {
      setCoarse(matchMedia("(pointer: coarse)").matches);
      const element = document.getElementById("chatForm") as HTMLFormElement | null;
      setForm(element);
    });
    pruneDrafts();
  }, []);

  /* ---------- menu state ---------- */

  const openMenu = (next: Menu, nextQuery = "") => {
    window.clearTimeout(closeTimer.current);
    setClosing(false);
    setMenu(next);
    setQuery(nextQuery);
    setActive(0);
  };
  const closeMenu = () => {
    if (!menu || closing) return;
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => { setMenu(null); setClosing(false); setQuery(""); }, 120);
  };

  /** Rewrites the "@query" token; an empty replacement removes it. */
  const replaceToken = (replacement: string) => {
    const input = composerInput();
    if (!input || !menu || menu.mode === "plus") return;
    const end = menu.start + 1 + query.length;
    input.value = input.value.slice(0, menu.start) + replacement + input.value.slice(end);
    const caret = menu.start + replacement.length;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    scheduleSave();
  };
  /** Runs an action picked from the palette and closes it. */
  const finish = (action: () => void) => {
    replaceToken("");
    closeMenu();
    action();
    if (menu?.mode === "plus") composerInput()?.focus({ preventScroll: true });
  };
  const goTo = (page: Page) => {
    if (!menu) return;
    if (menu.mode !== "plus") replaceToken(menu.mode === "mention" ? "@" : "/");
    setMenu({ ...menu, page });
    setQuery("");
    setActive(0);
    if (menu.mode === "plus") search.current?.focus({ preventScroll: true });
  };
  const back = () => goTo("root");

  /* ---------- mentions: "@Name" lives in the text, the list says which names are links ---------- */

  const addMention = (chip: MentionChip) => setMentions((list) => list.some((item) => item.kind === chip.kind && item.id === chip.id) ? list : [...list, chip]);
  /** Puts "@Name " where the "@query" was typed, or at the caret when picked from "+". */
  const insertMention = (chip: MentionChip) => {
    const token = `@${chip.name} `;
    if (menu && menu.mode !== "plus") replaceToken(token);
    else {
      const input = composerInput();
      if (!input) return;
      const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
      const before = input.value.slice(0, start);
      const text = (before && !/\s$/.test(before) ? " " : "") + token;
      input.setRangeText(text, start, end, "end");
      input.focus({ preventScroll: true });
      input.dispatchEvent(new Event("input", { bubbles: true }));
      scheduleSave();
    }
    addMention(chip);
    closeMenu();
  };

  /* ---------- drafts: one per conversation, kept for 24 hours ----------
     Only what the user does is saved: the chat controller also empties the
     composer in code, and that must never wipe a stored draft. */

  const keyRef = useRef(draftKey(null, null));
  const conversationRef = useRef<number | null>(selectedChatId);
  const userRef = useRef(userId);
  const mentionsRef = useRef(mentions);
  const pending = useRef<{ key: string; text: string } | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const flushSave = () => {
    window.clearTimeout(saveTimer.current);
    const save = pending.current;
    pending.current = null;
    if (save) writeDraft(save.key, save.text, save.key === keyRef.current ? mentionsRef.current : readDraft(save.key)?.mentions ?? []);
  };
  function scheduleSave() {
    const input = composerInput();
    if (!input) return;
    pending.current = { key: keyRef.current, text: input.value };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flushSave, 250);
  }
  const showConversation = (conversationId: number | null, force = false) => {
    conversationRef.current = conversationId;
    const key = draftKey(userRef.current, conversationId);
    const input = composerInput();
    // Re-announcing the same chat must not wipe what is being typed. The chat controller
    // also empties the composer as it starts, so an empty one gets its draft back.
    if (!force && key === keyRef.current && input?.value) return;
    flushSave();
    keyRef.current = key;
    const draft = readDraft(key);
    if (input && input.value !== (draft?.text ?? "")) {
      input.value = draft?.text ?? "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setMentions(draft?.mentions ?? []);
  };

  useLayoutEffect(() => { mentionsRef.current = mentions; }, [mentions]);

  /* ---------- live handlers for the textarea and the chat controller ---------- */

  // Entries carry click handlers that touch refs; building them reads none.
  // eslint-disable-next-line react-hooks/refs
  const sections = buildSections();
  const entries = sections.flatMap((section) => section.entries);
  function navigate(event: KeyboardEvent | ReactKeyboardEvent) {
    const stop = () => { event.preventDefault(); event.stopPropagation(); if ("stopImmediatePropagation" in event) event.stopImmediatePropagation(); };
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      stop();
      if (entries.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length);
    } else if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      const entry = entries[active];
      // While a list is still loading, Enter waits instead of sending "@git" as text.
      if (entry) { stop(); pick(entry); } else if (sections.some((section) => section.loading)) stop(); else if (event.key === "Enter") closeMenu();
    } else if (event.key === "Escape") {
      stop();
      if (menu && menu.page !== "root") back();
      else { if (menu && menu.mode !== "plus") dismissed.current = menu.start; closeMenu(); if (menu?.mode === "plus") plusButton.current?.focus(); }
    } else if (event.key === "Backspace" && !query && menu && menu.page !== "root") {
      stop();
      back();
    }
  }
  function pick(entry: PaletteEntry) { entry.run(); }

  const live = useRef<{ sync: () => void; keydown: (event: KeyboardEvent) => void; showConversation: typeof showConversation; scheduleSave: () => void; insertMention: (chip: MentionChip) => void }>({ sync: () => {}, keydown: () => {}, showConversation, scheduleSave, insertMention: () => {} });
  useLayoutEffect(() => {
    live.current.showConversation = showConversation;
    live.current.scheduleSave = scheduleSave;
    live.current.insertMention = (chip) => { if (menu && !closing) closeMenu(); insertMention(chip); };
    live.current.sync = () => {
      const input = composerInput();
      if (!input || menu?.mode === "plus") return;
      let found = input.selectionStart === input.selectionEnd ? findTrigger(input.value, input.selectionStart ?? 0) : null;
      // The caret right after "@GitHub" sits on a picked mention, not on a new "@" search.
      const start = found?.start;
      if (found && mentionRanges(input.value, mentionsRef.current).some((range) => range.start === start)) found = null;
      if (!found) { dismissed.current = null; if (menu) closeMenu(); return; }
      if (dismissed.current === found.start) return;
      const mode: Mode = found.char === "@" ? "mention" : "slash";
      if (menu && !closing && menu.mode === mode && menu.start === found.start) {
        if (found.query !== query) { setQuery(found.query); setActive(0); }
      } else openMenu({ mode, page: "root", start: found.start }, found.query);
    };
    live.current.keydown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (open && menu?.mode !== "plus") { navigate(event); return; }
      // A mention is deleted as a whole, as in ChatGPT.
      const input = composerInput();
      // Backspace in an empty composer removes the mode chip.
      if (event.key === "Backspace" && input && !input.value && modeRef.current) { event.preventDefault(); setChatMode(null); return; }
      if (!input || (event.key !== "Backspace" && event.key !== "Delete") || input.selectionStart !== input.selectionEnd) return;
      const caret = input.selectionStart ?? 0;
      const hit = mentionRanges(input.value, mentionsRef.current).find((range) => event.key === "Backspace" ? caret > range.start && caret <= range.end : caret >= range.start && caret < range.end);
      if (!hit) return;
      event.preventDefault();
      input.setRangeText("", hit.start, hit.end, "end");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      live.current.scheduleSave();
    };
  });


  useEffect(() => {
    const input = composerInput();
    if (!input) return;
    // Mentions whose "@Name" was edited away stop being links.
    const prune = () => {
      const value = input.value;
      if (mentionsRef.current.some((chip) => !value.includes(`@${chip.name}`))) setMentions((list) => list.filter((chip) => value.includes(`@${chip.name}`)));
    };
    const onInput = (event: Event) => { if (event.isTrusted) live.current.scheduleSave(); prune(); live.current.sync(); };
    // The chat controller also sets the text in code (send, suggestions, edit); report those too.
    const native = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!;
    Object.defineProperty(input, "value", {
      configurable: true,
      get() { return native.get!.call(this); },
      set(next: string) { native.set!.call(this, next); prune(); this.dispatchEvent(new Event(COMPOSER_VALUE_EVENT)); },
    });
    const onCaret = () => live.current.sync();
    const onKeyDown = (event: KeyboardEvent) => live.current.keydown(event);
    const onKeyUp = (event: KeyboardEvent) => { if (/^(Arrow(Left|Right)|Home|End)$/.test(event.key)) live.current.sync(); };
    const onState = (event: Event) => live.current.showConversation((event as CustomEvent<{ conversationId: number | null }>).detail?.conversationId ?? null);
    // Plugins are already named in the text; a mentioned skill also applies its
    // instructions and mentioned map places send their address and coordinates.
    const onCollect = (event: Event) => {
      const detail = (event as CustomEvent<{ presetId?: number | null; mode?: ChatMode; places?: { name: string; lat: number; lng: number; address?: string }[] }>).detail;
      if (modeRef.current) detail.mode = modeRef.current;
      const ranges = mentionRanges(input.value, mentionsRef.current);
      const skill = ranges.find((range) => range.chip.kind === "skill");
      if (skill) detail.presetId = Number(skill.chip.id);
      const places = ranges.filter((range) => range.chip.kind === "place" && range.chip.lat !== undefined && range.chip.lng !== undefined)
        .map(({ chip }) => ({ name: chip.name, lat: chip.lat!, lng: chip.lng!, ...(chip.address ? { address: chip.address.slice(0, 200) } : {}) }));
      if (places.length) detail.places = places.filter((place, index) => places.findIndex((other) => other.lat === place.lat && other.lng === place.lng) === index).slice(0, 5);
    };
    // "Ask Genyxo" on a map place puts it into the composer as a mention.
    const onMention = (event: Event) => live.current.insertMention((event as CustomEvent<MentionChip>).detail);
    const onSent = () => {
      window.clearTimeout(saveTimer.current);
      pending.current = null;
      writeDraft(keyRef.current, "", []);
      setMentions([]);
      setChatMode(null);
    };
    input.addEventListener("input", onInput);
    input.addEventListener("click", onCaret);
    input.addEventListener("keydown", onKeyDown, true);
    input.addEventListener("keyup", onKeyUp);
    document.addEventListener("genyxo:chat-state", onState);
    document.addEventListener("genyxo:composer-collect", onCollect);
    document.addEventListener("genyxo:composer-sent", onSent);
    document.addEventListener("genyxo:composer-mention", onMention);
    return () => {
      document.removeEventListener("genyxo:composer-mention", onMention);
      input.removeEventListener("input", onInput);
      input.removeEventListener("click", onCaret);
      input.removeEventListener("keydown", onKeyDown, true);
      input.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("genyxo:chat-state", onState);
      document.removeEventListener("genyxo:composer-collect", onCollect);
      document.removeEventListener("genyxo:composer-sent", onSent);
      delete (input as { value?: string }).value;
    };
  }, [form]);

  // The signed-in user arrives after mount; their drafts replace the guest ones.
  useEffect(() => {
    userRef.current = userId;
    live.current.showConversation(conversationRef.current, true);
  }, [userId]);

  useEffect(() => {
    const leave = () => flushSave();
    addEventListener("pagehide", leave);
    return () => { removeEventListener("pagehide", leave); window.clearTimeout(closeTimer.current); flushSave(); };
  }, []);

  // Outside clicks close the palette; the composer itself keeps "@" and "/" open.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || plusButton.current?.contains(target)) return;
      if (menu?.mode !== "plus" && composerInput()?.contains(target)) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  useEffect(() => {
    const input = composerInput();
    if (!input) return;
    const listening = open && menu?.mode !== "plus";
    if (listening) { input.setAttribute("aria-controls", PALETTE_ID); input.setAttribute("aria-expanded", "true"); }
    else { input.removeAttribute("aria-controls"); input.setAttribute("aria-expanded", "false"); }
    if (listening && entries[active]) input.setAttribute("aria-activedescendant", optionId(entries[active]));
    else input.removeAttribute("aria-activedescendant");
  });

  useEffect(() => {
    if (!open || menu?.mode !== "plus" || coarse) return;
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, menu?.mode, coarse]);


  /* ---------- actions ---------- */

  const attachLibraryItem = async (item: LibraryItem) => {
    setBusyId(item.id);
    try {
      const full = item.content !== undefined || item.url ? item : await workspaceRequest<LibraryItem>(`library/${item.id}`);
      if (full.type === "image" && full.url) {
        const blob = await fetch(full.url).then((response) => { if (!response.ok) throw new Error("Image could not be loaded"); return response.blob(); });
        attachFiles([new File([blob], full.name || "image.png", { type: blob.type || "image/png" })]);
      } else {
        const name = /\.\w+$/.test(full.name) ? full.name : `${full.name}.md`;
        attachFiles([new File([full.content || ""], name, { type: "text/markdown" })]);
      }
      finish(() => {});
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to attach", "error");
    } finally {
      setBusyId(null);
    }
  };
  const chooseProject = (id: number | null) => { setActiveProjectId(id); notify(id ? `Working in ${projects.find((project) => project.id === id)?.name}` : "Project cleared"); };
  const openCanvas = () => document.dispatchEvent(new CustomEvent("genyxo:canvas-open", { detail: { content: "# Untitled\n\nStart writing here.\n", language: "markdown", title: "Untitled document" } }));

  function buildSections(): PaletteSection[] {
    if (!menu) return [];
    const needle = query.trim().toLowerCase();
    const matches = (entry: PaletteEntry) => !needle || `${entry.title} ${entry.hint || ""} ${entry.keywords || ""}`.toLowerCase().includes(needle);
    const icon = (name: string) => <WorkspaceIcon name={name} size={18} />;
    const filter = (list: PaletteSection[]) => list.map((section) => ({ ...section, entries: section.entries.filter(matches) }));
    const pluginEntry = (plugin: Plugin): PaletteEntry => ({ id: `plugin-${plugin.id}`, icon: <PluginLogo id={plugin.id} size={18} />, title: plugin.name, hint: plugin.description, keywords: "plugin app", run: () => insertMention({ kind: "plugin", id: plugin.id, name: plugin.name }) });
    const skillEntry = (preset: Preset): PaletteEntry => ({ id: `skill-${preset.id}`, icon: icon("sparkles"), title: preset.name, hint: preset.description || "Skill", keywords: "skill", run: () => insertMention({ kind: "skill", id: String(preset.id), name: preset.name }) });
    const activeProject = projects.find((project) => project.id === activeProjectId);

    const files: PaletteEntry = { id: "files", icon: icon("upload"), title: menu.mode === "plus" ? "Photos & files" : "Add photos & files", hint: "Upload from your device", keywords: "attach upload image pdf document", run: () => finish(() => document.getElementById("gxPlusFiles")?.click()) };
    const camera: PaletteEntry = { id: "camera", icon: icon("camera"), title: "Take a photo", hint: "Use your camera", run: () => finish(() => document.getElementById("gxPlusCamera")?.click()) };
    const libraryEntry: PaletteEntry = { id: "library", icon: icon("library"), title: "From Library", hint: "Saved documents and images", keywords: "attach saved", submenu: true, run: () => goTo("library") };
    const sketchEntry: PaletteEntry = { id: "sketch", icon: icon("draw"), title: "Draw", hint: "Sketch and attach it as an image", keywords: "sketch drawing", run: () => finish(() => setSketch(true)) };
    const image: PaletteEntry = { id: "image", icon: icon("image"), title: "Create an image", hint: "Switch to DALL·E 3", keywords: "picture generate", run: () => finish(() => switchModel("openai/dall-e-3", "Describe the image you want…")) };
    const video: PaletteEntry = { id: "video", icon: icon("video"), title: "Make a video", hint: "Switch to Kling video", keywords: "clip generate", run: () => finish(() => switchModel("kling-video", "Describe the video you want…")) };
    const webSearch: PaletteEntry = { id: "web-search", icon: modeIcon("search"), title: "Web search", hint: "Search for current news and information", keywords: "internet browse google news online", current: chatMode === "search", run: () => finish(() => toggleMode("search")) };
    const research: PaletteEntry = { id: "deep-research", icon: modeIcon("research"), title: "Deep research", hint: "Get a detailed report with sources", keywords: "report analysis investigate study", current: chatMode === "research", run: () => finish(() => toggleMode("research")) };
    const canvas: PaletteEntry = { id: "canvas", icon: icon("canvas"), title: "Canvas", hint: "Write or code side by side", keywords: "document editor code", run: () => finish(openCanvas) };
    const project: PaletteEntry = { id: "project", icon: icon("folder"), title: "Project", hint: activeProject ? `In ${activeProject.name}` : "Use a project's files and instructions", keywords: "work in", submenu: true, run: () => goTo("project") };
    const pluginsEntry: PaletteEntry = { id: "plugins", icon: icon("plugins"), title: "Plugins", hint: "Use a connected app", keywords: "apps integrations", submenu: true, run: () => goTo("plugin") };
    const skillsEntry: PaletteEntry = { id: "skills", icon: icon("sparkles"), title: "Skills", hint: "Apply your saved instructions", keywords: "preset", submenu: true, run: () => goTo("skill") };
    const pluginEntries = (plugins || []).map(pluginEntry);
    const skillEntries = (presets || []).map(skillEntry);
    const projectEntries: PaletteEntry[] = projects.map((item) => ({ id: `project-${item.id}`, icon: icon("folder"), title: item.name, hint: "Project files and instructions apply", current: item.id === activeProjectId, run: () => finish(() => chooseProject(item.id)) }));
    const placeEntries: PaletteEntry[] = (savedPlaces || []).map((place) => ({
      id: `place-${place.id}`,
      icon: <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><path fill="currentColor" d="M10 2a6 6 0 0 1 6 6c0 4.5-6 10-6 10S4 12.5 4 8a6 6 0 0 1 6-6Zm0 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" /></svg>,
      title: place.label,
      hint: place.address || "Saved place",
      keywords: "place map location saved home work",
      run: () => insertMention({ kind: "place", id: `${place.lat.toFixed(6)},${place.lng.toFixed(6)}`, name: place.label, lat: place.lat, lng: place.lng, address: place.address }),
    }));
    const libraryEntries: PaletteEntry[] = (library || []).map((item) => ({ id: `library-${item.id}`, icon: icon(item.type === "image" ? "image" : "file"), title: item.name, hint: item.type === "image" ? "Image" : "Document", busy: busyId === item.id, run: () => void attachLibraryItem(item) }));
    // A search also finds what lives a level down: installed plugins, skills, projects and Library items.
    const found: PaletteSection[] = needle ? [
      { id: "found-plugins", label: "Plugins", loading: !plugins, entries: pluginEntries },
      { id: "found-skills", label: "Skills", loading: !presets, entries: skillEntries },
      { id: "found-places", label: "My Places", entries: placeEntries },
      { id: "found-projects", label: "Projects", entries: projectEntries },
      { id: "found-library", label: "Library", loading: !library, entries: libraryEntries },
    ] : [];

    switch (menu.page) {
      case "library": return filter([{ id: "library", loading: !library, empty: "Your Library is empty. Save answers or canvas documents to reuse them here.", entries: libraryEntries }]);
      case "project": return filter([{ id: "projects", empty: "No projects yet. Create one from the sidebar.", entries: [
        { id: "project-none", icon: icon("close"), title: "No project", hint: "Chat without project context", current: !activeProjectId, run: () => finish(() => chooseProject(null)) },
        ...projectEntries,
      ] }]);
      case "skill": return filter([{ id: "skills", loading: !presets, empty: "No skills yet.", entries: [...skillEntries, { id: "skills-manage", icon: icon("settings"), title: "Manage skills", hint: "Create and edit skills", run: () => finish(() => router.push("/plugins?tab=skills")) }] }]);
      case "plugin": return filter([{ id: "plugins", loading: !plugins, entries: [...pluginEntries, { id: "plugins-manage", icon: icon("settings"), title: pluginEntries.length ? "Manage plugins" : "Connect a plugin", hint: "GitHub, Notion, Gmail and more", run: () => finish(() => router.push("/plugins")) }] }]);
      case "model": {
        const { current, models } = readModels();
        return filter([{ id: "models", empty: "No models available.", entries: models.map((model) => ({ id: `model-${model.value}`, icon: icon("sparkles"), title: model.label, current: model.value === current, run: () => finish(() => switchModel(model.value)) })) }]);
      }
    }

    if (menu.mode === "slash") {
      const { current, models } = readModels();
      const currentLabel = models.find((model) => model.value === current)?.label;
      return filter([{ id: "commands", entries: [
        { id: "model", icon: icon("cube"), title: "Model", hint: currentLabel ? `Switch from ${currentLabel}` : "Choose a model", submenu: true, run: () => goTo("model") },
        webSearch, research, project, skillsEntry, pluginsEntry, image, video, canvas,
        { id: "dictate", icon: icon("mic"), title: "Dictate", hint: "Turn speech into text", keywords: "voice microphone", run: () => finish(() => document.getElementById("voiceBtn")?.click()) },
        { id: "new", icon: icon("new"), title: "New chat", hint: "Start a fresh conversation", keywords: "clear reset", run: () => finish(() => startNewChat()) },
        { id: "help", icon: icon("help"), title: "Help & feedback", hint: "Contact Genyxo support", keywords: "support report", run: () => finish(() => router.push("/support")) },
      ] }]);
    }
    if (menu.mode === "mention") {
      return filter([
        { id: "actions", entries: [files, libraryEntry, image, webSearch, research, project, sketchEntry, canvas] },
        { id: "plugins", label: "Plugins", loading: !plugins, entries: pluginEntries.length ? pluginEntries : needle ? [] : [{ ...pluginsEntry, id: "plugins-connect", title: "Connect a plugin", hint: "GitHub, Notion, Gmail and more", submenu: false, run: () => finish(() => router.push("/plugins")) }] },
        { id: "skills", label: "Skills", loading: !presets, entries: skillEntries },
        { id: "places", label: "My Places", entries: placeEntries },
        ...found.filter((section) => section.id === "found-projects" || section.id === "found-library"),
      ]);
    }
    return filter([
      { id: "add", entries: [files, ...(coarse ? [camera] : []), libraryEntry, sketchEntry] },
      { id: "research", entries: [webSearch, research] },
      { id: "create", entries: [image, video, canvas] },
      { id: "work", entries: [project, pluginsEntry, skillsEntry] },
      ...found,
    ]);
  }

  return <>
    <button ref={plusButton} type="button" className="plus-btn" id="plusBtn" disabled={disabled} aria-label="Add files and more" aria-haspopup="listbox" aria-expanded={open && menu?.mode === "plus"}
      onClick={() => (open && menu?.mode === "plus" ? closeMenu() : openMenu({ mode: "plus", page: "root", start: -1 }))}>
      <WorkspaceIcon name="plus" />
    </button>
    {chatMode && <button type="button" className="gx-mode-chip" data-mode={chatMode} key={chatMode} title={`Turn off ${MODES[chatMode].title}`} aria-label={`${MODES[chatMode].title} is on. Turn it off`} onClick={() => { setChatMode(null); composerInput()?.focus(); }}>
      <span className="gx-mode-icon">{modeIcon(chatMode, 16)}</span>
      <span className="gx-mode-off" aria-hidden="true"><WorkspaceIcon name="close" size={13} /></span>
      <span>{MODES[chatMode].title}</span>
    </button>}
    <input id="gxPlusFiles" type="file" multiple hidden accept={ACCEPT} onChange={(event) => { attachFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    <input id="gxPlusCamera" type="file" hidden accept="image/*" capture="environment" onChange={(event) => { attachFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    {form && <ComposerSurface form={form} mentions={mentions} onOpen={(chip) => openMention(chip, router.push)} />}
    {menu && form && <ComposerPalette anchor={form} compact={menu.mode === "plus"} sections={sections} active={active} onActive={setActive} onPick={pick} closing={closing} panelRef={panel}
      title={menu.page === "root" ? undefined : PAGE_TITLES[menu.page]} onBack={back}
      search={menu.mode === "plus" ? <label className="gx-cp-search"><WorkspaceIcon name="search" size={15} />
        <input ref={search} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} onKeyDown={navigate} placeholder={menu.page === "root" ? "Search" : `Search ${PAGE_TITLES[menu.page].toLowerCase()}`}
          aria-label="Search the add menu" role="combobox" aria-expanded="true" aria-controls={PALETTE_ID} aria-activedescendant={entries[active] ? optionId(entries[active]) : undefined} />
      </label> : undefined} />}
    {sketch && <SketchDialog onClose={() => setSketch(false)} onAttach={(file) => { attachFiles([file]); setSketch(false); }} />}
  </>;
}
