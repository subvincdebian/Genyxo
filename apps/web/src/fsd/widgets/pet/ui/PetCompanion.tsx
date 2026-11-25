"use client";
import DOMPurify from "dompurify";
import { marked } from "marked";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/shared/i18n";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import {
  PETS,
  getPetSettings,
  getServerPetSettings,
  petAtlasUrl,
  subscribePetSettings,
  updatePetSettings,
} from "@/shared/lib/pets";
import { createPetEngine, type PetEngine } from "../model/pet-engine";
import {
  openPetSettings,
  revealAfterPetNavigation,
} from "../model/pet-transition";
import {
  acceptAttachment,
  petSignedIn,
  resetPetThread,
  sendToPet,
  type PetAttachment,
  type PetMessage,
} from "../model/pet-chat";
import { createDictation, type DictationState, type PetDictation } from "../model/pet-dictation";
import {
  IMAGE_MODEL,
  VIDEO_MODEL,
  findPetModel,
  getPetModel,
  getServerPetModel,
  modelIcon,
  setPetModel,
  subscribePetModel,
} from "../model/pet-models";
import { closeOpenFence, useTypewriter } from "../model/pet-typing";
import { PetModelPicker } from "./PetModelPicker";
import { MODE_TITLES, PetPlusMenu, modeIcon, type PetMode } from "./PetPlusMenu";
import { PetPopover, usePresence } from "./PetPopover";
import { PetSketch } from "./PetSketch";
import { PetNudge, PetSelectionBar, PetSuggestions } from "./PetAssist";
import {
  dismissReminder,
  dueReminder,
  listenForReminders,
  nextDueAt,
  pageFile,
  selectionPrompt,
  snoozeReminder,
  subscribeReminders,
  type SelectionAction,
} from "../model/pet-assist";
import styles from "./PetCompanion.module.css";
import assist from "./PetAssist.module.css";

const EXPLAIN_PAGE =
  "Explain what is on this page (attached): what it is for, the key information, and what I can do here. Be brief and practical.";

/** The voice call the pet can start; injected by the app so widgets stay independent. */
export type PetVoice = {
  getVoiceSnapshot: () => { active: boolean; phase: string };
  subscribeVoice: (listener: () => void) => () => void;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
};
type VoiceModule = PetVoice;
type LoadVoice = () => Promise<PetVoice>;

const reducedMotion = () =>
  document.documentElement.dataset.gxMotion === "on" ||
  (document.documentElement.dataset.gxMotion !== "off" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches);

const icon = (path: string) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={path} />
  </svg>
);
const ICONS = {
  plus: "M12 5v14M5 12h14",
  send: "M12 19V5m-6 6 6-6 6 6",
  stop: "M7 7h10v10H7z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3",
  close: "M6 6l12 12M18 6 6 18",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12h2m12 0h2M12 4v2m0 12v2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4",
  hide: "M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4 9.5 6a13 13 0 0 1-2.6 3.4M6.6 6.7A13.6 13.6 0 0 0 2.5 12c1 2 4.5 6 9.5 6a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2",
  fresh: "M4 5v5h5M20 19v-5h-5M5.5 15a7 7 0 0 0 12 2.5M18.5 9a7 7 0 0 0-12-2.5",
  copy: "M9 9h10v10H9zM5 15V5h10",
  check: "m5 12 5 5 9-10",
  chevron: "m7 10 5 5 5-5",
};
/** The waveform on the voice-conversation button, as in the main composer. */
const WAVE = (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    {[5, 9, 13, 17, 21].map((x, index) => (
      <rect key={x} x={x - 1.1} y={[9, 5, 3, 6, 9][index]} width="2.2" height={[6, 14, 18, 12, 6][index]} rx="1.1" fill="currentColor" />
    ))}
  </svg>
);

/** One answer, typed out smoothly with a breathing caret, as in the main chat. */
function PetReply({ message, reduced }: { message: PetMessage; reduced: boolean }) {
  const shown = useTypewriter(message.text, Boolean(message.streaming), reduced);
  const typing = Boolean(message.streaming) || shown.length < message.text.length;
  const [copied, setCopied] = useState(false);
  if (!message.text && !message.video)
    return (
      <div className={styles.thinking} role="status">
        <span className={styles.orb} aria-hidden="true" />
        <span className={styles.shimmer}>{message.activity || "Thinking"}</span>
      </div>
    );
  return (
    <div className={`${styles.reply} bot-message-text`} data-error={message.error || undefined} data-typing={typing || undefined}>
      {message.text && (
        <div
          className={styles.markdown}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(marked.parse(typing ? closeOpenFence(shown) : message.text, { async: false })),
          }}
        />
      )}
      {message.video && (
        <video className={styles.video} src={message.video} controls playsInline preload="metadata" />
      )}
      {!typing && !message.error && message.text && (
        <div className={styles.replyActions}>
          {message.model && (
            <span className={styles.replyModel}>
              <img src={modelIcon(message.model)} alt="" width={13} height={13} />
              {findPetModel(message.model).label}
            </span>
          )}
          <button
            type="button"
            aria-label={copied ? "Copied" : "Copy answer"}
            title={copied ? "Copied" : "Copy"}
            onClick={() => {
              void navigator.clipboard?.writeText(message.text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {icon(copied ? ICONS.check : ICONS.copy)}
          </button>
        </div>
      )}
    </div>
  );
}
const activityFor = (model: string, mode: PetMode | null) =>
  model === IMAGE_MODEL
    ? "Creating your image"
    : model === VIDEO_MODEL
      ? "Starting your video"
      : mode === "search"
        ? "Searching the web"
        : mode === "research"
          ? "Researching"
          : "Thinking";

export function PetCompanion({ loadVoice }: { loadVoice: LoadVoice }) {
  // Finish a transition the pet started on the previous page.
  useEffect(() => revealAfterPetNavigation(), []);
  const settings = useSyncExternalStore(
    subscribePetSettings,
    getPetSettings,
    getServerPetSettings,
  );
  if (!settings.enabled) return null;
  return <Pet key={settings.id} loadVoice={loadVoice} />;
}

function Pet({ loadVoice }: { loadVoice: LoadVoice }) {
  const { t } = useLanguage();
  const text = useCallback(
    (key: string, fallback: string) => t(`pets.${key}`, fallback),
    [t],
  );
  const settings = useSyncExternalStore(
    subscribePetSettings,
    getPetSettings,
    getServerPetSettings,
  );
  const pet = PETS.find((item) => item.id === settings.id) || PETS[0];
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const engine = useRef<PetEngine | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [side, setSide] = useState<{ above: boolean; left: boolean }>({
    above: true,
    left: true,
  });
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<PetMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<PetAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [voice, setVoice] = useState<{ active: boolean; phase: string }>({
    active: false,
    phase: "idle",
  });
  const stop = useRef<(() => void) | null>(null);
  const voiceModule = useRef<VoiceModule | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  // Composer extras: model, "+" modes, project and skill context.
  const model = useSyncExternalStore(subscribePetModel, getPetModel, getServerPetModel);
  const [mode, setMode] = useState<PetMode | null>(null);
  const [project, setProject] = useState<{ id: number; name: string } | null>(null);
  const [skill, setSkill] = useState<{ id: number; name: string } | null>(null);
  const [popover, setPopover] = useState<"plus" | "model" | null>(null);
  const [lastPopover, setLastPopover] = useState<"plus" | "model">("plus");
  const popoverMounted = usePresence(Boolean(popover));
  const [sketch, setSketch] = useState(false);
  const [dictation, setDictation] = useState<DictationState>("idle");
  const dictator = useRef<PetDictation | null>(null);
  // Elements the popovers anchor to; state so they re-render once mounted.
  const [composer, setComposer] = useState<HTMLFormElement | null>(null);
  const [plusButton, setPlusButton] = useState<HTMLButtonElement | null>(null);
  const [modelButton, setModelButton] = useState<HTMLButtonElement | null>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setReduced(reducedMotion()));
  }, []);
  // Text from the page the next question is about ("Ask" on a selection).
  const [quote, setQuote] = useState("");
  // Reminders: the one due now; a snoozed one wakes the component when it is due.
  const reminder = useSyncExternalStore(subscribeReminders, dueReminder, () => null);
  const [, setClock] = useState(0);
  useEffect(() => listenForReminders(), []);
  useEffect(() => {
    const wait = nextDueAt() - Date.now();
    if (reminder || !Number.isFinite(wait)) return;
    const timer = setTimeout(() => setClock((value) => value + 1), Math.min(Math.max(wait, 0) + 50, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  });
  const showPopover = (next: "plus" | "model" | null) => {
    if (next) setLastPopover(next);
    setPopover(next);
  };

  // Sprite sheet first, then the engine: the pet never appears half-loaded.
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => !cancelled && setReady(true);
    image.src = petAtlasUrl(pet.id);
    return () => {
      cancelled = true;
    };
  }, [pet.id]);

  const anchor = useCallback(() => {
    const position = engine.current?.position();
    if (!position) return;
    setSide({
      above: position.y > 380,
      left: position.x + position.width / 2 > innerWidth / 2,
    });
  }, []);

  useEffect(() => {
    if (!ready || !root.current || !sprite.current) return;
    const initial = getPetSettings();
    const instance = createPetEngine({
      root: root.current,
      sprite: sprite.current,
      size: initial.size,
      start: { x: initial.x, y: initial.y },
      reducedMotion,
      onMoved: (x, y) => {
        updatePetSettings({ x, y });
        anchor();
      },
      onClick: () => {
        setMenu(false);
        setOpen((value) => !value);
      },
    });
    engine.current = instance;
    anchor();
    instance.play("wave");

    // The main chat and notifications drive the same reactions.
    const sent = () => instance.setBase("think");
    const token = () => {
      instance.setBase("idle");
      instance.talk();
    };
    const done = (event: Event) => {
      const detail = (event as CustomEvent<{ ok?: boolean; aborted?: boolean }>)
        .detail;
      instance.setBase("idle");
      if (detail?.ok) instance.play("happy");
      else if (!detail?.aborted) instance.play("failed");
    };
    const notified = () => instance.play("jump");
    document.addEventListener("genyxo:composer-sent", sent);
    document.addEventListener("genyxo:answer-token", token);
    document.addEventListener("genyxo:answer-done", done);
    document.addEventListener("genyxo:notification", notified);
    window.addEventListener("resize", anchor);
    return () => {
      document.removeEventListener("genyxo:composer-sent", sent);
      document.removeEventListener("genyxo:answer-token", token);
      document.removeEventListener("genyxo:answer-done", done);
      document.removeEventListener("genyxo:notification", notified);
      window.removeEventListener("resize", anchor);
      instance.destroy();
      engine.current = null;
    };
  }, [ready, anchor]);

  useEffect(() => {
    engine.current?.setSize(settings.size);
  }, [settings.size]);

  useEffect(() => {
    if (open) {
      anchor();
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open, anchor]);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [messages]);

  // Close the panel and menu on Escape or a click elsewhere. Menus opened
  // from the composer live in a portal and count as part of the pet.
  useEffect(() => {
    if (!open && !menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || sketch) return;
      if (popover) {
        setPopover(null);
        input.current?.focus();
        return;
      }
      setOpen(false);
      setMenu(false);
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (root.current?.contains(target) || target.closest?.("[data-pet-layer]") || sketch) return;
      setMenu(false);
      if (!busy && !draft && !files.length && dictation === "idle") setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, menu, busy, draft, files.length, popover, sketch, dictation]);
  if (!open && popover) setPopover(null);

  useEffect(
    () => () => {
      stop.current?.();
      voiceModule.current?.stopVoice();
      dictator.current?.dispose();
    },
    [],
  );

  /** Liquid exit: squash, stretch and dissolve, then unmount everything. */
  function hide() {
    setMenu(false);
    setOpen(false);
    stop.current?.();
    voiceModule.current?.stopVoice();
    const node = sprite.current;
    if (!node || reducedMotion()) {
      updatePetSettings({ enabled: false });
      return;
    }
    engine.current?.destroy();
    const motion = node.animate(
      [
        { scale: "1 1", filter: "blur(0px)", opacity: 1 },
        { scale: "1.18 0.82", filter: "blur(0px)", opacity: 1, offset: 0.25 },
        { scale: "0.86 1.16", filter: "blur(1px)", opacity: 0.95, offset: 0.5 },
        { scale: "0.2 0.2", filter: "blur(10px)", opacity: 0 },
      ],
      { duration: 520, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
    );
    void motion.finished.then(
      () => updatePetSettings({ enabled: false }),
      () => updatePetSettings({ enabled: false }),
    );
  }

  function submit() {
    const message = draft.trim();
    if ((!message && !files.length && !quote) || busy) return;
    if (!send({ shown: message, message: quote ? `${message || "Tell me about this."}\n\n"""\n${quote}\n"""` : message, attachments: files, quote })) return;
    setDraft("");
    setFiles([]);
    setQuote("");
    setMode(null);
    setPopover(null);
    dictator.current?.stop();
    if (input.current) input.current.style.height = "auto";
  }

  /** One question to the pet; `shown` is what the user's bubble says. */
  function send({ shown, message, attachments, quote: about }: { shown: string; message: string; attachments: PetAttachment[]; quote?: string }) {
    if (busy) return false;
    if (!petSignedIn()) {
      setNotice(text("sign_in", "Sign in to chat with your pet."));
      engine.current?.play("failed");
      return false;
    }
    const replyId = nextId.current + 1;
    const request = { model, mode: mode || undefined, presetId: skill?.id, projectId: project?.id };
    setMessages((old) => [
      ...old,
      {
        id: nextId.current,
        role: "user",
        text: shown,
        quote: about || undefined,
        files: attachments.map((item) => item.name),
      },
      { id: replyId, role: "pet", text: "", streaming: true, model, activity: about || attachments.length ? "Reading" : activityFor(model, mode) },
    ]);
    nextId.current += 2;
    setNotice("");
    setBusy(true);
    engine.current?.setBase("think");
    stop.current = sendToPet(message, attachments, request, {
      onRoute: (routed) =>
        setMessages((old) => old.map((item) => (item.id === replyId ? { ...item, model: routed, activity: activityFor(routed, mode) } : item))),
      onActivity: (activity) =>
        setMessages((old) => old.map((item) => (item.id === replyId ? { ...item, activity } : item))),
      onVideo: (video) =>
        setMessages((old) => old.map((item) => (item.id === replyId ? { ...item, video } : item))),
      onToken: (chunk) => {
        engine.current?.setBase("idle");
        engine.current?.talk();
        setMessages((old) =>
          old.map((item) =>
            item.id === replyId ? { ...item, text: item.text + chunk } : item,
          ),
        );
      },
      onDone: (ok, error) => {
        stop.current = null;
        setBusy(false);
        engine.current?.setBase("idle");
        engine.current?.play(ok ? "happy" : "failed");
        setMessages((old) =>
          old.map((item) =>
            item.id === replyId
              ? {
                  ...item,
                  streaming: false,
                  error: !ok,
                  text:
                    item.text ||
                    (item.video
                      ? ""
                      : ok
                        ? text("stopped", "Stopped.")
                        : error || text("failed", "Something went wrong.")),
                }
              : item,
          ),
        );
      },
    });
    return true;
  }

  /** "Explain this page": the page goes along as a text file. */
  function explainPage() {
    setMenu(false);
    setOpen(true);
    engine.current?.play("wave");
    send({ shown: text("explain_page", "Explain this page"), message: EXPLAIN_PAGE, attachments: [pageFile()] });
  }

  /** Summarize, explain or ask about text selected on the page. */
  function onSelection(action: SelectionAction, selected: string) {
    setMenu(false);
    setOpen(true);
    engine.current?.play("wave");
    if (action === "ask") {
      setQuote(selected);
      requestAnimationFrame(() => input.current?.focus());
      return;
    }
    const shown = action === "summarize" ? text("summarize", "Summarize") : text("explain", "Explain");
    send({ shown, message: `${selectionPrompt(action)}\n\n"""\n${selected}\n"""`, attachments: [], quote: selected });
  }

  // A reminder arrives: the pet jumps and waves for a while, then waits calmly.
  const reminderId = reminder?.id;
  useEffect(() => {
    if (!reminderId || !ready) return;
    engine.current?.play("jump");
    let beats = 0;
    const timer = setInterval(() => {
      beats += 1;
      engine.current?.play(beats % 2 ? "wave" : "jump");
      if (beats >= 5) clearInterval(timer);
    }, 3600);
    return () => clearInterval(timer);
  }, [reminderId, ready]);

  function openReminder() {
    if (!reminder) return;
    dismissReminder(reminder.id);
    if (reminder.link && reminder.link !== location.pathname) router.push(reminder.link);
  }

  function addFiles(selected: FileList | File[] | null) {
    if (!selected) return;
    const accepted: PetAttachment[] = [];
    for (const file of Array.from(selected).slice(0, 4 - files.length)) {
      const problem = acceptAttachment(file);
      if (problem) setNotice(problem);
      else accepted.push({ file, name: file.name });
    }
    if (accepted.length) setFiles((old) => [...old, ...accepted]);
  }

  function toggleDictation() {
    if (!petSignedIn()) {
      setNotice(text("sign_in", "Sign in to chat with your pet."));
      return;
    }
    dictator.current ??= createDictation({
      onState: (state) => {
        setDictation(state);
        if (state === "listening") engine.current?.setBase("listen");
        else if (state === "idle") engine.current?.setBase("idle");
      },
      onText: (spoken) => {
        setDraft((old) => [old.trim(), spoken].filter(Boolean).join(" "));
        requestAnimationFrame(() => {
          const field = input.current;
          if (!field) return;
          field.focus();
          field.style.height = "auto";
          field.style.height = `${Math.min(120, field.scrollHeight)}px`;
        });
      },
      onError: (message) => setNotice(message),
    });
    setNotice("");
    dictator.current.toggle();
  }
  function chooseProject(next: { id: number; name: string } | null) {
    if (next?.id === project?.id) return;
    setProject(next);
    // A project applies to a new conversation, so the thread starts over.
    if (messages.length) {
      stop.current?.();
      resetPetThread();
      setMessages([]);
    }
  }
  function mention(name: string) {
    setDraft((old) => `${old}${old && !/\s$/.test(old) ? " " : ""}@${name} `);
    requestAnimationFrame(() => input.current?.focus());
  }

  async function toggleVoice() {
    const loaded =
      voiceModule.current ||
      (voiceModule.current = await loadVoice());
    if (loaded.getVoiceSnapshot().active) {
      loaded.stopVoice();
      return;
    }
    if (!petSignedIn()) {
      setNotice(text("sign_in", "Sign in to chat with your pet."));
      return;
    }
    await loaded.startVoice();
  }
  // Mirror the voice call (started here or in the chat) in the pet's mood.
  useEffect(() => {
    let release: (() => void) | undefined;
    let cancelled = false;
    void loadVoice().then((loaded) => {
      if (cancelled) return;
      voiceModule.current = loaded;
      let speaking: ReturnType<typeof setInterval> | undefined;
      const sync = () => {
        const snapshot = loaded.getVoiceSnapshot();
        setVoice({ active: snapshot.active, phase: snapshot.phase });
        clearInterval(speaking);
        const instance = engine.current;
        if (!instance) return;
        if (!snapshot.active) instance.setBase("idle");
        else if (snapshot.phase === "listening") instance.setBase("listen");
        else if (snapshot.phase === "thinking") instance.setBase("think");
        else if (snapshot.phase === "speaking") {
          instance.setBase("idle");
          instance.talk(900);
          speaking = setInterval(() => engine.current?.talk(900), 600);
        }
      };
      const unsubscribe = loaded.subscribeVoice(sync);
      release = () => {
        clearInterval(speaking);
        unsubscribe();
      };
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [ready, loadVoice]);

  if (!ready) return null;
  const voiceLabel = voice.active
    ? text("voice_stop", "End voice conversation")
    : text("voice_start", "Talk with voice");
  return (
    <div
      ref={root}
      className={styles.root}
      data-pet={pet.id}
      data-pet-root=""
      style={{ "--pet-accent": pet.accent } as CSSProperties}
      onContextMenu={(event) => {
        event.preventDefault();
        setOpen(false);
        setMenu(true);
        anchor();
      }}
    >
      <div
        ref={sprite}
        className={styles.sprite}
        role="button"
        tabIndex={0}
        aria-label={`${pet.name}. ${text("open_chat", "Open pet chat")}`}
        aria-expanded={open}
        style={{ backgroundImage: `url(${petAtlasUrl(pet.id)})` }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
            event.preventDefault();
            setMenu(true);
          }
        }}
      />
      {reminder && !open && <span className={assist.halo} aria-hidden="true" />}
      {reminder && !open && !menu && (
        <PetNudge
          reminder={reminder}
          above={side.above}
          left={side.left}
          onOpen={openReminder}
          onSnooze={() => snoozeReminder(reminder.id)}
          onDismiss={() => dismissReminder(reminder.id)}
        />
      )}
      <PetSelectionBar petName={pet.name} onAction={onSelection} />
      {voice.active && (
        <span className={styles.voiceBadge} data-phase={voice.phase}>
          <i />
          <i />
          <i />
        </span>
      )}
      {menu && (
        <div
          className={styles.menu}
          role="menu"
          data-above={side.above}
          data-left={side.left}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" role="menuitem" onClick={explainPage}>
            <WorkspaceIcon name="search" size={18} />
            {text("explain_page", "Explain this page")}
          </button>
          <a
            role="menuitem"
            href="/profile#pets"
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              setMenu(false);
              const box = sprite.current?.getBoundingClientRect();
              openPetSettings(
                box
                  ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
                  : { x: innerWidth / 2, y: innerHeight / 2 },
              );
            }}
          >
            {icon(ICONS.settings)}
            {text("settings", "Pet settings")}
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={hide}
          >
            {icon(ICONS.hide)}
            {`${text("hide", "Hide")} ${pet.name}`}
          </button>
        </div>
      )}
      {open && (
        <section
          className={styles.panel}
          data-above={side.above}
          data-left={side.left}
          aria-label={`${text("chat_with", "Chat with")} ${pet.name}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <strong>{pet.name}</strong>
            <span>
              <button
                type="button"
                title={text("new_thread", "New conversation")}
                aria-label={text("new_thread", "New conversation")}
                disabled={busy || !messages.length}
                onClick={() => {
                  resetPetThread();
                  setMessages([]);
                }}
              >
                {icon(ICONS.fresh)}
              </button>
              <button
                type="button"
                title={text("close", "Close")}
                aria-label={text("close", "Close")}
                onClick={() => setOpen(false)}
              >
                {icon(ICONS.close)}
              </button>
            </span>
          </header>
          {messages.length === 0 && !quote && <PetSuggestions onExplainPage={explainPage} />}
          {messages.length > 0 && (
            <div ref={list} className={styles.messages} aria-live="polite">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className={styles.user}>
                    {message.quote && <blockquote className={styles.quote}>{message.quote}</blockquote>}
                    {message.text}
                    {message.files?.map((name) => (
                      <small key={name}>{name}</small>
                    ))}
                  </div>
                ) : (
                  <PetReply key={message.id} message={message} reduced={reduced} />
                ),
              )}
            </div>
          )}
          {notice && (
            <p className={styles.notice} role="alert">
              {notice}
            </p>
          )}
          <form
            ref={setComposer}
            className={styles.composer}
            data-dictation={dictation}
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              ref={filePicker}
              type="file"
              hidden
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,text/*,.md,.csv,.json"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            {(files.length > 0 || mode || skill || project || quote) && (
              <div className={styles.chips}>
                {quote && (
                  <button type="button" className={styles.chip} title="Remove the selected text" onClick={() => setQuote("")}>
                    <span className={styles.chipIcon}>
                      <WorkspaceIcon name="edit" size={14} />
                    </span>
                    <span className={styles.chipClose}>{icon(ICONS.close)}</span>
                    {`“${quote.replace(/\s+/g, " ").slice(0, 48)}${quote.length > 48 ? "…" : ""}”`}
                  </button>
                )}
                {mode && (
                  <button type="button" className={styles.chip} data-kind="mode" title={`Turn off ${MODE_TITLES[mode]}`} onClick={() => setMode(null)}>
                    <span className={styles.chipIcon}>{modeIcon(mode, 14)}</span>
                    <span className={styles.chipClose}>{icon(ICONS.close)}</span>
                    {MODE_TITLES[mode]}
                  </button>
                )}
                {project && (
                  <button type="button" className={styles.chip} title="Stop using this project" onClick={() => chooseProject(null)}>
                    <span className={styles.chipIcon}>
                      <WorkspaceIcon name="folder" size={14} />
                    </span>
                    <span className={styles.chipClose}>{icon(ICONS.close)}</span>
                    {project.name}
                  </button>
                )}
                {skill && (
                  <button type="button" className={styles.chip} title="Remove this skill" onClick={() => setSkill(null)}>
                    <span className={styles.chipIcon}>
                      <WorkspaceIcon name="sparkles" size={14} />
                    </span>
                    <span className={styles.chipClose}>{icon(ICONS.close)}</span>
                    {skill.name}
                  </button>
                )}
                {files.map((item, index) => (
                  <button
                    key={`${item.name}-${index}`}
                    type="button"
                    className={styles.chip}
                    data-kind="file"
                    title={text("remove_file", "Remove file")}
                    onClick={() => setFiles((old) => old.filter((_, at) => at !== index))}
                  >
                    <span className={styles.chipIcon}>
                      <WorkspaceIcon name={item.file.type.startsWith("image/") ? "image" : "file"} size={14} />
                    </span>
                    <span className={styles.chipClose}>{icon(ICONS.close)}</span>
                    {item.name}
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={8000}
              placeholder={
                dictation === "listening"
                  ? "Listening…"
                  : dictation === "transcribing"
                    ? "Transcribing…"
                    : model === IMAGE_MODEL
                      ? "Describe the image you want…"
                      : model === VIDEO_MODEL
                        ? "Describe the video you want…"
                        : mode === "search"
                          ? "Search the web…"
                          : mode === "research"
                            ? "What should I research?"
                            : `${text("ask", "Ask")} ${pet.name}…`
              }
              aria-label={`${text("ask", "Ask")} ${pet.name}`}
              onChange={(event) => {
                setDraft(event.target.value);
                engine.current?.touch();
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(120, event.target.scrollHeight)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                } else if (event.key === "Backspace" && !draft && mode) {
                  event.preventDefault();
                  setMode(null);
                }
              }}
              onPaste={(event) => {
                if (event.clipboardData.files.length) {
                  event.preventDefault();
                  addFiles(event.clipboardData.files);
                }
              }}
            />
            <div className={styles.toolbar}>
              <button
                ref={setPlusButton}
                type="button"
                className={styles.tool}
                aria-label="Add files and more"
                title="Add files and more"
                aria-haspopup="dialog"
                aria-expanded={popover === "plus"}
                data-open={popover === "plus"}
                onClick={() => showPopover(popover === "plus" ? null : "plus")}
              >
                <span className={styles.plusGlyph}>{icon(ICONS.plus)}</span>
              </button>
              <span className={styles.spacer} />
              <button
                ref={setModelButton}
                type="button"
                className={styles.modelButton}
                aria-label={`Model: ${findPetModel(model).label}. Change model`}
                aria-haspopup="dialog"
                aria-expanded={popover === "model"}
                data-open={popover === "model"}
                onClick={() => showPopover(popover === "model" ? null : "model")}
              >
                <img src={modelIcon(model)} alt="" width={15} height={15} />
                <span key={model}>{findPetModel(model).label}</span>
                {icon(ICONS.chevron)}
              </button>
              <button
                type="button"
                className={styles.tool}
                data-state={dictation}
                aria-label={dictation === "listening" ? "Stop dictation" : dictation === "transcribing" ? "Transcribing" : "Dictate a message"}
                title={dictation === "listening" ? "Stop dictation" : "Dictate"}
                disabled={dictation === "transcribing"}
                onClick={toggleDictation}
              >
                {dictation === "transcribing" ? <span className={styles.toolSpinner} /> : icon(dictation === "listening" ? ICONS.stop : ICONS.mic)}
              </button>
              {busy ? (
                <button type="button" className={styles.action} data-kind="stop" aria-label={text("stop", "Stop answer")} title={text("stop", "Stop answer")} onClick={() => stop.current?.()}>
                  {icon(ICONS.stop)}
                </button>
              ) : draft.trim() || files.length || quote ? (
                <button key="send" type="submit" className={styles.action} data-kind="send" aria-label={text("send", "Send")} title={text("send", "Send")}>
                  {icon(ICONS.send)}
                </button>
              ) : (
                <button
                  key="voice"
                  type="button"
                  className={styles.action}
                  data-kind="voice"
                  data-active={voice.active}
                  aria-label={voiceLabel}
                  title={voiceLabel}
                  onClick={() => void toggleVoice()}
                >
                  {voice.active ? icon(ICONS.close) : WAVE}
                </button>
              )}
            </div>
          </form>
          {popoverMounted && (
            <PetPopover
              anchor={composer}
              trigger={lastPopover === "plus" ? plusButton : modelButton}
              open={Boolean(popover)}
              align={lastPopover === "plus" ? "start" : "end"}
              width={lastPopover === "plus" ? 330 : 300}
              cap={lastPopover === "plus" ? 340 : 360}
              label={lastPopover === "plus" ? "Add to your message" : "Choose a model"}
              accent={pet.accent}
              onClose={() => setPopover(null)}
            >
              {lastPopover === "plus" ? (
                <PetPlusMenu
                  model={model}
                  mode={mode}
                  projectId={project?.id ?? null}
                  presetId={skill?.id ?? null}
                  onClose={() => {
                    setPopover(null);
                    input.current?.focus({ preventScroll: true });
                  }}
                  onUpload={() => filePicker.current?.click()}
                  onAttach={addFiles}
                  onSketch={() => setSketch(true)}
                  onMode={setMode}
                  onModel={setPetModel}
                  onProject={chooseProject}
                  onSkill={setSkill}
                  onMention={mention}
                  onError={setNotice}
                />
              ) : (
                <PetModelPicker
                  value={model}
                  onPick={(value) => {
                    setPetModel(value);
                    setPopover(null);
                    input.current?.focus({ preventScroll: true });
                  }}
                  onClose={() => setPopover(null)}
                />
              )}
            </PetPopover>
          )}
          {sketch && (
            <PetSketch
              accent={pet.accent}
              onClose={() => setSketch(false)}
              onAttach={(file) => {
                addFiles([file]);
                setSketch(false);
                input.current?.focus();
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}
