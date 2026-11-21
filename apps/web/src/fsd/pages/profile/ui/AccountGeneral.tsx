"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  defaultAppearance,
  readAppearance,
  saveAppearance,
  type Appearance,
} from "@/shared/lib/appearance";
import {
  FONT_OPTIONS,
  REPLY_FONT_OPTIONS,
  findFont,
  fontReady,
  loadFontPreviews,
  type FontOption,
} from "@/shared/lib/fonts";
import {
  DEFAULT_INTERACTIONS,
  bindingProblem,
  formatBinding,
  getInteractions,
  getServerInteractions,
  shortcutBinding,
  shortcutConflict,
  subscribeInteractions,
  updateInteractions,
  type Shortcut,
} from "@/shared/lib/interaction-settings";
import { transitionTheme } from "@/shared/lib/theme-transition";
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  detectLanguage,
  useLanguage,
} from "@/shared/i18n";
import { Select } from "@/shared/ui/Select";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { useLanguageFocus } from "../model/use-language-focus";
import { Action, Row, Section, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountGeneral.module.css";

/** English names shown next to each native language name. */
const ENGLISH_NAMES: Record<string, string> = {
  en: "English",
  uk: "Ukrainian",
  es: "Spanish",
  de: "German",
  fr: "French",
};
const SEND_PRESETS = ["Enter", "Ctrl+Enter", "Shift+Enter", "Alt+Enter"];
const BACKGROUND_FALLBACKS = ["Ctrl+Shift+Enter", "Alt+Shift+Enter"];
const CUSTOM = "__custom__";
const CATEGORY_LABELS: Record<string, string> = {
  sans: "Sans",
  serif: "Serif",
  mono: "Mono",
  readable: "Readable",
  fun: "Fun",
};

function Keys({ binding }: { binding: string }) {
  const keys = formatBinding(binding).split("+");
  return (
    <span className={styles.keys} data-font-preview>
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`}>{key}</kbd>
      ))}
    </span>
  );
}

export function AccountGeneral() {
  const { text } = useAccountText();
  const { lang, preference, changeLanguage } = useLanguage();
  const { settings, saving, error } = useSyncExternalStore(
    subscribeInteractions,
    getInteractions,
    getServerInteractions,
  );
  const [value, setValue] = useState<Appearance>(defaultAppearance);
  const [recording, setRecording] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [switching, setSwitching] = useState(false);
  const languageRow = useRef<HTMLDivElement>(null);
  const recorder = useRef<HTMLButtonElement>(null);
  useLanguageFocus(languageRow);

  useEffect(() => {
    loadFontPreviews();
    const sync = () => setValue(readAppearance());
    queueMicrotask(sync);
    document.addEventListener("genyxo:appearance", sync);
    window.addEventListener("storage", sync);
    return () => {
      document.removeEventListener("genyxo:appearance", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const send = settings.shortcuts.send;
  const sendBinding = send.enabled ? send.binding : "";

  function applySend(binding: string) {
    setProblem("");
    setNotice("");
    if (binding === send.binding && send.enabled) return;
    const patch: Record<string, Shortcut> = {
      send: { binding, enabled: true },
    };
    const conflict = shortcutConflict(settings.shortcuts, "send", binding);
    if (conflict?.id === "backgroundSend") {
      // Keep "send in background" available by moving it to a free combination.
      const free = BACKGROUND_FALLBACKS.find(
        (candidate) =>
          candidate !== binding &&
          !shortcutConflict(settings.shortcuts, "backgroundSend", candidate),
      );
      patch.backgroundSend = free
        ? { binding: free, enabled: true }
        : { ...settings.shortcuts.backgroundSend, enabled: false };
      setNotice(
        free
          ? `${text("background_send_moved", "“Send message in background” now uses")} ${formatBinding(free)}.`
          : text(
              "background_send_disabled",
              "“Send message in background” was turned off to avoid a conflict.",
            ),
      );
    } else if (conflict) {
      setProblem(
        `${text("shortcut_used", "Already used by")} “${text(`shortcut_${conflict.id}`, conflict.title)}”.`,
      );
      return;
    }
    void updateInteractions({ shortcuts: patch });
  }

  useEffect(() => {
    if (!recording) return;
    document.documentElement.dataset.gxShortcutRecording = "true";
    requestAnimationFrame(() => recorder.current?.focus());
    const keydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const bare =
        !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey;
      if (event.code === "Escape" && bare) {
        setRecording(false);
        return;
      }
      if (
        ["Control", "Meta", "Shift", "Alt"].includes(event.key) ||
        event.isComposing ||
        event.repeat
      )
        return;
      const binding = shortcutBinding(event);
      const invalid = bindingProblem("send", binding, event);
      if (invalid) {
        setProblem(
          invalid === "modifier"
            ? text(
                "send_key_modifier",
                "Use Enter, or combine Ctrl, Alt or Shift with a key.",
              )
            : text(
                "shortcut_reserved",
                "This combination belongs to your browser. Choose another.",
              ),
        );
        return;
      }
      setRecording(false);
      applySend(binding);
    };
    window.addEventListener("keydown", keydown, true);
    return () => {
      delete document.documentElement.dataset.gxShortcutRecording;
      window.removeEventListener("keydown", keydown, true);
    };
    // applySend reads the latest settings through this effect's dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, settings.shortcuts, text]);

  async function changeFont(
    field: "uiFont" | "replyFont",
    id: string,
    source: HTMLElement,
  ) {
    setSwitching(true);
    await fontReady(id);
    setSwitching(false);
    const next = { ...readAppearance(), [field]: id };
    transitionTheme(() => {
      setValue(next);
      saveAppearance(next);
    }, source);
  }
  function changeMotion(motion: Appearance["motion"]) {
    const next = { ...readAppearance(), motion };
    setValue(next);
    saveAppearance(next);
  }

  const sendLabel = (binding: string) =>
    binding === CUSTOM
      ? text("send_key_custom", "Record custom shortcut…")
      : formatBinding(binding);
  const sendHelp = !sendBinding
    ? text("send_key_off", "Keyboard sending is off. Use the send button.")
    : sendBinding === "Enter"
      ? text(
          "send_key_enter_help",
          "Enter sends your message. Shift+Enter adds a new line.",
        )
      : `${formatBinding(sendBinding)} ${text("send_key_combo_help", "sends your message. Enter adds a new line.")}`;
  const sendOptions = [
    ...SEND_PRESETS,
    ...(sendBinding && !SEND_PRESETS.includes(sendBinding) ? [sendBinding] : []),
  ];
  const fontOption = (options: readonly FontOption[]) => {
    const OptionView = (id: string, label: ReactNode) => {
      const font = options.find((item) => item.id === id);
      return (
        <span className={styles.fontOption}>
          <span
            data-font-preview
            style={{ fontFamily: font?.stack || "inherit" }}
          >
            {label}
          </span>
          {font && CATEGORY_LABELS[font.category] && (
            <small aria-hidden="true">
              {text(
                `font_category_${font.category}`,
                CATEGORY_LABELS[font.category],
              )}
            </small>
          )}
        </span>
      );
    };
    return OptionView;
  };
  const fontName = (font: FontOption) =>
    font.id === "default"
      ? text("font_default", "Default")
      : font.id === "system"
        ? text("font_system", "System")
        : font.id === "inherit"
          ? text("font_same_as_interface", "Same as interface")
          : font.label;
  const uiFont = findFont(value.uiFont);
  const replyFont =
    value.replyFont === "inherit" ? uiFont : findFont(value.replyFont);
  const changed =
    preference !== "en" ||
    value.uiFont !== defaultAppearance.uiFont ||
    value.replyFont !== defaultAppearance.replyFont ||
    value.motion !== defaultAppearance.motion ||
    send.binding !== DEFAULT_INTERACTIONS.shortcuts.send.binding ||
    !send.enabled;

  return (
    <>
      <div ref={languageRow} className={styles.highlightTarget}>
        <Section title={text("language_region", "Language & region")}>
          <div className={page.group}>
            <Row
              title={text("interface_language", "Interface language")}
              description={text(
                "interface_language_help",
                "Used for menus, settings and notifications across Genyxo.",
              )}
            >
              <Select
                aria-label={text("interface_language", "Interface language")}
                value={preference}
                onChange={(event) => void changeLanguage(event.target.value)}
                renderOption={(code, label) => (
                  <span className={styles.languageOption}>
                    <span>{label}</span>
                    {code !== "auto" && code !== lang && (
                      <small aria-hidden="true">{ENGLISH_NAMES[code]}</small>
                    )}
                  </span>
                )}
              >
                <option value="auto">
                  {`${text("auto_detect", "Auto-detect")} · ${LANGUAGE_NAMES[detectLanguage()]}`}
                </option>
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {LANGUAGE_NAMES[language]}
                  </option>
                ))}
              </Select>
            </Row>
          </div>
        </Section>
      </div>

      <Section title={text("message_editor", "Message editor")}>
        <div className={page.group}>
          <Row
            title={text("send_key", "Send key combination")}
            description={sendHelp}
          >
            {recording ? (
              <button
                ref={recorder}
                type="button"
                className={styles.recorder}
                aria-label={text(
                  "send_key_recording",
                  "Press the new key combination. Esc cancels.",
                )}
                onBlur={() => setRecording(false)}
                onClick={() => setRecording(false)}
              >
                <span className={styles.recorderDot} aria-hidden="true" />
                {text("press_keys", "Press keys…")}
                <kbd>Esc</kbd>
              </button>
            ) : (
              <Select
                aria-label={text("send_key", "Send key combination")}
                value={sendBinding || "Enter"}
                onChange={(event) => {
                  if (event.target.value === CUSTOM) {
                    setProblem("");
                    setNotice("");
                    setRecording(true);
                  } else applySend(event.target.value);
                }}
                renderOption={(binding) =>
                  binding === CUSTOM ? (
                    <span className={styles.customOption}>
                      <WorkspaceIcon name="plus" size={15} />
                      {sendLabel(CUSTOM)}
                    </span>
                  ) : (
                    <Keys binding={binding} />
                  )
                }
              >
                {sendOptions.map((binding) => (
                  <option key={binding} value={binding}>
                    {sendLabel(binding)}
                  </option>
                ))}
                <option value={CUSTOM}>{sendLabel(CUSTOM)}</option>
              </Select>
            )}
          </Row>
        </div>
        <div className={styles.messages} aria-live="polite">
          {problem && (
            <p key={problem} role="alert" className={styles.problem}>
              <WorkspaceIcon name="info" size={15} />
              {problem}
            </p>
          )}
          {notice && !problem && (
            <p key={notice} className={styles.notice}>
              <WorkspaceIcon name="check" size={15} />
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className={styles.problem}>
              {error}
              <Action
                onClick={() =>
                  void updateInteractions({ shortcuts: settings.shortcuts })
                }
              >
                {text("try_again", "Try again")}
              </Action>
            </p>
          )}
          {saving && !error && (
            <p className={styles.saving}>{text("saving", "Saving…")}</p>
          )}
        </div>
      </Section>

      <Section title={text("typography", "Typography")}>
        <div className={page.group} aria-busy={switching}>
          <Row
            title={text("interface_font", "Interface font")}
            description={text(
              "interface_font_help",
              "Menus, settings, the chat list and the message editor.",
            )}
          >
            <Select
              aria-label={text("interface_font", "Interface font")}
              value={value.uiFont}
              onChange={(event) =>
                void changeFont("uiFont", event.target.value, event.currentTarget)
              }
              renderOption={fontOption(FONT_OPTIONS)}
            >
              {FONT_OPTIONS.map((font) => (
                <option key={font.id} value={font.id}>
                  {fontName(font)}
                </option>
              ))}
            </Select>
          </Row>
          <Row
            title={text("response_font", "Response font")}
            description={text(
              "response_font_help",
              "How answers from AI models read in the chat. Code stays monospaced.",
            )}
          >
            <Select
              aria-label={text("response_font", "Response font")}
              value={value.replyFont}
              onChange={(event) =>
                void changeFont(
                  "replyFont",
                  event.target.value,
                  event.currentTarget,
                )
              }
              renderOption={fontOption(REPLY_FONT_OPTIONS)}
            >
              {REPLY_FONT_OPTIONS.map((font) => (
                <option key={font.id} value={font.id}>
                  {fontName(font)}
                </option>
              ))}
            </Select>
          </Row>
        </div>
        <div
          className={styles.preview}
          aria-label={text("font_preview", "Font preview")}
          role="img"
        >
          <div
            key={`ui-${value.uiFont}`}
            className={styles.previewUser}
            data-font-preview
            style={
              { fontFamily: uiFont?.stack || "var(--gx-font)" } as CSSProperties
            }
          >
            {text(
              "font_preview_question",
              "Can you summarize this report in three bullet points?",
            )}
          </div>
          <div
            key={`reply-${replyFont?.id}`}
            className={styles.previewReply}
            data-font-preview
            style={
              {
                fontFamily: replyFont?.stack || "var(--gx-font)",
              } as CSSProperties
            }
          >
            <strong>
              {text("font_preview_title", "Here’s the short version")}
            </strong>
            <p>
              {text(
                "font_preview_answer",
                "Revenue grew 18% this quarter, driven by enterprise plans. Costs stayed flat, and the team expects steady growth next year.",
              )}
            </p>
            <code>npm run report</code>
          </div>
        </div>
      </Section>

      <Section title={text("accessibility", "Accessibility")}>
        <div className={page.group}>
          <Row
            title={text("animations", "Animations")}
            description={text(
              "animations_help",
              "Reduced turns off animations and transitions across Genyxo. System follows your device setting.",
            )}
          >
            <SegmentedControl
              label={text("animations", "Animations")}
              value={
                value.motion === "on"
                  ? "reduced"
                  : value.motion === "off"
                    ? "all"
                    : "system"
              }
              onChange={(choice) =>
                changeMotion(
                  choice === "reduced" ? "on" : choice === "all" ? "off" : "system",
                )
              }
              options={[
                { value: "system", label: text("system", "System") },
                { value: "all", label: text("animations_all", "All") },
                { value: "reduced", label: text("animations_reduced", "Reduced") },
              ]}
            />
          </Row>
        </div>
      </Section>

      <div className={styles.footer}>
        <span>
          {text(
            "general_saved_help",
            "Changes apply instantly. The send key also syncs to your account.",
          )}
        </span>
        <button
          type="button"
          className={`${styles.reset} ${changed ? styles.resetVisible : ""}`}
          aria-hidden={!changed}
          tabIndex={changed ? 0 : -1}
          onClick={(event) => {
            const next = {
              ...readAppearance(),
              uiFont: defaultAppearance.uiFont,
              replyFont: defaultAppearance.replyFont,
              motion: defaultAppearance.motion,
            };
            transitionTheme(() => {
              setValue(next);
              saveAppearance(next);
            }, event.currentTarget);
            setProblem("");
            setNotice("");
            void updateInteractions({
              shortcuts: {
                send: DEFAULT_INTERACTIONS.shortcuts.send,
                backgroundSend: DEFAULT_INTERACTIONS.shortcuts.backgroundSend,
              },
            });
            void changeLanguage("en");
          }}
        >
          {text("reset_general", "Reset general settings")}
        </button>
      </div>
    </>
  );
}
