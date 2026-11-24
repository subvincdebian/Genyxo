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
import { useLanguage } from "@/shared/i18n";
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
import styles from "./PetCompanion.module.css";

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
};

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

  // Close the panel and menu on Escape or a click elsewhere.
  useEffect(() => {
    if (!open && !menu) return;
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      setMenu(false);
    };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setMenu(false);
        if (!busy && !draft && !files.length) setOpen(false);
      }
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open, menu, busy, draft, files.length]);

  useEffect(
    () => () => {
      stop.current?.();
      voiceModule.current?.stopVoice();
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
    if ((!message && !files.length) || busy) return;
    if (!petSignedIn()) {
      setNotice(text("sign_in", "Sign in to chat with your pet."));
      engine.current?.play("failed");
      return;
    }
    const replyId = nextId.current + 1;
    setMessages((old) => [
      ...old,
      {
        id: nextId.current,
        role: "user",
        text: message,
        files: files.map((item) => item.name),
      },
      { id: replyId, role: "pet", text: "", streaming: true },
    ]);
    nextId.current += 2;
    const attachments = files;
    setDraft("");
    setFiles([]);
    setNotice("");
    setBusy(true);
    engine.current?.setBase("think");
    stop.current = sendToPet(message, attachments, {
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
                    (ok
                      ? text("stopped", "Stopped.")
                      : error || text("failed", "Something went wrong.")),
                }
              : item,
          ),
        );
      },
    });
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const accepted: PetAttachment[] = [];
    for (const file of Array.from(selected).slice(0, 4 - files.length)) {
      const problem = acceptAttachment(file);
      if (problem) setNotice(problem);
      else accepted.push({ file, name: file.name });
    }
    if (accepted.length) setFiles((old) => [...old, ...accepted]);
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
          {messages.length > 0 && (
            <div ref={list} className={styles.messages} aria-live="polite">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className={styles.user}>
                    {message.text}
                    {message.files?.map((name) => (
                      <small key={name}>{name}</small>
                    ))}
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={`${styles.reply} bot-message-text`}
                    data-error={message.error || undefined}
                    data-streaming={message.streaming || undefined}
                  >
                    {message.text ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(
                            marked.parse(message.text, { async: false }),
                          ),
                        }}
                      />
                    ) : (
                      <span className={styles.dots}>
                        <i />
                        <i />
                        <i />
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
          {notice && (
            <p className={styles.notice} role="alert">
              {notice}
            </p>
          )}
          {files.length > 0 && (
            <div className={styles.files}>
              {files.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  title={text("remove_file", "Remove file")}
                  onClick={() =>
                    setFiles((old) => old.filter((_, at) => at !== index))
                  }
                >
                  {item.name}
                  {icon(ICONS.close)}
                </button>
              ))}
            </div>
          )}
          <form
            className={styles.composer}
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
            <button
              type="button"
              aria-label={text("attach", "Attach files")}
              title={text("attach", "Attach files")}
              disabled={files.length >= 4}
              onClick={() => filePicker.current?.click()}
            >
              {icon(ICONS.plus)}
            </button>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={8000}
              placeholder={`${text("ask", "Ask")} ${pet.name}…`}
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
                }
              }}
              onPaste={(event) => {
                if (event.clipboardData.files.length) {
                  event.preventDefault();
                  addFiles(event.clipboardData.files);
                }
              }}
            />
            <button
              type="button"
              className={styles.voice}
              data-active={voice.active}
              aria-label={voiceLabel}
              title={voiceLabel}
              onClick={() => void toggleVoice()}
            >
              {icon(voice.active ? ICONS.stop : ICONS.mic)}
            </button>
            {busy ? (
              <button
                type="button"
                className={styles.send}
                aria-label={text("stop", "Stop answer")}
                onClick={() => stop.current?.()}
              >
                {icon(ICONS.stop)}
              </button>
            ) : (
              <button
                type="submit"
                className={styles.send}
                aria-label={text("send", "Send")}
                disabled={!draft.trim() && !files.length}
              >
                {icon(ICONS.send)}
              </button>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
