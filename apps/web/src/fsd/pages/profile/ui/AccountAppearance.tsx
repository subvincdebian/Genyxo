"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  defaultAppearance,
  readAppearance,
  saveAppearance,
  presets,
  type Appearance,
  type Palette,
} from "@/shared/lib/appearance";
import { createPortal } from "react-dom";
import { copyText } from "@/shared/lib/clipboard";
import { useTopLayer } from "@/shared/lib/top-layer";
import { exportTheme, importTheme } from "@/shared/lib/theme-codec";
import { transitionTheme } from "@/shared/lib/theme-transition";
import { useLanguage, LANGUAGES, LANGUAGE_NAMES } from "@/shared/i18n";
import { Select } from "@/shared/ui/Select";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import {
  WorkspaceDialog,
  WorkspaceIcon,
  WorkspaceTooltip,
} from "@/shared/ui/workspace";
import { Action, Row, Section, useAccountText } from "./account-ui";
import { applyAccountTheme, type Theme } from "./AccountPreferences";
import { readAccountTheme } from "@/shared/lib/theme";
import { useLanguageFocus } from "../model/use-language-focus";
import styles from "./ProfilePage.module.css";

export function AccountAppearance() {
  const { text } = useAccountText();
  const { lang, changeLanguage } = useLanguage();
  const [value, setValue] = useState<Appearance>(defaultAppearance);
  const [mode, setMode] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  );
  const importButton = useRef<HTMLButtonElement>(null);
  const languageRow = useRef<HTMLDivElement>(null);
  useLanguageFocus(expanded, setExpanded, languageRow);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    queueMicrotask(() => {
      setValue(readAppearance());
      setMode(readAccountTheme());
      setSystemDark(media.matches);
    });
    const sync = () => setSystemDark(media.matches);
    const preferences = () => {
      setMode(readAccountTheme());
      setValue(readAppearance());
    };
    media.addEventListener("change", sync);
    document.addEventListener("genyxo:theme", preferences);
    window.addEventListener("storage", preferences);
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("genyxo:theme", preferences);
      window.removeEventListener("storage", preferences);
    };
  }, []);
  const light = mode === "light" || (mode === "system" && !systemDark);
  const key = light ? "light" : "dark";
  const palette = value[key];
  const appearanceDirty =
    JSON.stringify(value) !== JSON.stringify(defaultAppearance) ||
    mode !== "system" ||
    lang !== "en";
  const notify = (message: string) => setToast({ message, id: Date.now() });
  function update(patch: Partial<Appearance>, source?: HTMLElement | null) {
    const next = { ...value, ...patch };
    const commit = () => {
      setValue(next);
      saveAppearance(next);
      setError("");
    };
    if (source) transitionTheme(commit, source);
    else commit();
  }
  function colors(patch: Partial<Palette>) {
    update({
      [key]: { ...palette, ...patch },
      ...(!value.separate && patch.accent
        ? {
            [light ? "dark" : "light"]: {
              ...value[light ? "dark" : "light"],
              accent: patch.accent,
            },
          }
        : {}),
    });
  }
  function preset(name: string, source: HTMLElement) {
    const p = presets[name];
    if (!p) return;
    const make = (light: boolean): Palette => ({
      preset: name,
      accent: p.accent,
      background: light ? p.light : p.dark,
      foreground: light ? "#171c1a" : "#f3f5f4",
    });
    update(
      value.separate
        ? { [key]: make(light) }
        : { light: make(true), dark: make(false) },
      source,
    );
  }
  async function copy() {
    try {
      await copyText(
        exportTheme(readAppearance(), key, { mode, language: lang }),
      );
      setError("");
      notify(text("theme_copied", "Theme copied"));
    } catch {
      setError(text("theme_copy_error", "Copy failed. Try again."));
    }
  }
  const badge = (name: string, label: ReactNode) => (
    <span className={styles.presetLabel}>
      <span
        aria-hidden="true"
        className={styles.presetBadge}
        style={{
          color: presets[name]?.accent || palette.accent,
          background: presets[name]?.[key] || palette.background,
        }}
      >
        Aa
      </span>
      {label}
    </span>
  );
  return (
    <>
      <Section title={text("visual_style", "Visual style")}>
        <div className={styles.group}>
          <Row title={text("mode", "Mode")}>
            <div
              role="radiogroup"
              aria-label={text("theme", "Color theme")}
              className={styles.modeOptions}
            >
              {(["system", "light", "dark"] as const).map((option) => (
                <WorkspaceTooltip
                  key={option}
                  label={text(
                    option,
                    option[0].toUpperCase() + option.slice(1),
                  )}
                  side="top"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-label={text(
                      option,
                      option[0].toUpperCase() + option.slice(1),
                    )}
                    aria-checked={mode === option}
                    onClick={(event) =>
                      transitionTheme(() => {
                        setMode(option);
                        applyAccountTheme(option);
                      }, event.currentTarget)
                    }
                    className={`${styles.modeOption} ${mode === option ? styles.modeActive : ""}`}
                  >
                    <span
                      className={`${styles.themePreview} ${styles[`preview_${option}`]}`}
                      aria-hidden="true"
                    >
                      <span className={styles.previewSidebar}>
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className={styles.previewContent}>
                        <i />
                        <i />
                        <i />
                        <b />
                      </span>
                      {mode === option && (
                        <span className={styles.themeCheck}>
                          <WorkspaceIcon name="check" size={13} />
                        </span>
                      )}
                    </span>
                  </button>
                </WorkspaceTooltip>
              ))}
            </div>
          </Row>
        </div>
      </Section>
      <Section title={text("theme", "Color theme")}>
        <div className={styles.group}>
          <Row title={text("preset", "Theme preset")}>
            <div className={styles.themeActions}>
              <WorkspaceTooltip
                label={text("import_theme", "Import theme")}
                side="top"
              >
                <button
                  ref={importButton}
                  type="button"
                  className={styles.iconButton}
                  aria-label={text("import_theme", "Import theme")}
                  onClick={() => setImporting(true)}
                >
                  <WorkspaceIcon name="download" size={17} />
                </button>
              </WorkspaceTooltip>
              <WorkspaceTooltip
                label={text("copy_theme", "Copy theme")}
                side="top"
              >
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={text("copy_theme", "Copy theme")}
                  onClick={() => void copy()}
                >
                  <WorkspaceIcon name="copy" size={17} />
                </button>
              </WorkspaceTooltip>
              <Select
                aria-label={text("preset", "Theme preset")}
                value={palette.preset}
                onChange={(event) =>
                  preset(event.target.value, event.currentTarget)
                }
                renderOption={badge}
              >
                {palette.preset === "Custom" && (
                  <option value="Custom">{text("custom", "Custom")}</option>
                )}
                {Object.keys(presets).map((name) => (
                  <option value={name} key={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
          </Row>
          {(
            [
              ["accent", "Accent"],
              ["background", "Background"],
              ["foreground", "Foreground"],
            ] as const
          ).map(([field, label]) => (
            <Row key={field} title={text(field, label)}>
              <label className={styles.colorControl}>
                <input
                  type="color"
                  aria-label={text(field, label)}
                  value={palette[field]}
                  onChange={(event) => colors({ [field]: event.target.value })}
                />
                <span>{palette[field].toUpperCase()}</span>
              </label>
            </Row>
          ))}
        </div>
      </Section>
      <div className={styles.additionalHeading}>
        <button
          type="button"
          className={styles.additionalToggle}
          aria-expanded={expanded}
          aria-controls="additional-appearance"
          onClick={() => setExpanded(!expanded)}
        >
          {text("additionally", "Additionally")}
          <span
            className={
              expanded ? styles.additionalChevronOpen : styles.additionalChevron
            }
          >
            <WorkspaceIcon name="chevron" size={15} />
          </span>
        </button>
        <button
          type="button"
          className={`${styles.additionalReset} ${appearanceDirty ? styles.additionalResetVisible : ""}`}
          aria-hidden={!appearanceDirty}
          tabIndex={appearanceDirty ? 0 : -1}
          onClick={() => {
            transitionTheme(() => {
              setValue(defaultAppearance);
              saveAppearance(defaultAppearance);
              setMode("system");
              applyAccountTheme("system");
            });
            void changeLanguage("en");
          }}
        >
          {text("reset_defaults", "Reset to default settings")}
        </button>
      </div>
      <div
        id="additional-appearance"
        className={`${styles.additionalReveal} ${expanded ? styles.additionalRevealOpen : ""}`}
        inert={!expanded}
        aria-hidden={!expanded}
      >
        <div className={styles.additionalClip}>
          <div className={styles.additionalBody}>
            <div className={styles.group}>
              <Row
                title={text("ui_font_size", "Interface font size")}
                description={text(
                  "ui_font_help",
                  "Applies to chat and workspace controls.",
                )}
              >
                <label className={styles.sizeControl}>
                  <input
                    type="number"
                    min={12}
                    max={20}
                    aria-label={text("ui_font_size", "Interface font size")}
                    value={value.uiSize}
                    onChange={(event) =>
                      update({
                        uiSize: Math.max(
                          12,
                          Math.min(20, Number(event.target.value) || 14),
                        ),
                      })
                    }
                  />
                  <span>px</span>
                </label>
              </Row>
              <Row title={text("code_font_size", "Code font size")}>
                <label className={styles.sizeControl}>
                  <input
                    type="number"
                    min={10}
                    max={20}
                    aria-label={text("code_font_size", "Code font size")}
                    value={value.codeSize}
                    onChange={(event) =>
                      update({
                        codeSize: Math.max(
                          10,
                          Math.min(20, Number(event.target.value) || 13),
                        ),
                      })
                    }
                  />
                  <span>px</span>
                </label>
              </Row>
            </div>
            <div className={styles.group}>
              <Row title={text("reduce_motion", "Reduce motion")}>
                <SegmentedControl
                  label={text("reduce_motion", "Reduce motion")}
                  value={value.motion}
                  onChange={(motion) =>
                    update({ motion: motion as Appearance["motion"] })
                  }
                  options={[
                    { value: "system", label: text("system", "System") },
                    { value: "on", label: text("on", "On") },
                    { value: "off", label: text("off", "Off") },
                  ]}
                />
              </Row>
              <Row
                title={text(
                  "separate_modes",
                  "Separate settings for light and dark mode",
                )}
                description={text(
                  "separate_modes_help",
                  "Keep independent themes and colors for each mode.",
                )}
              >
                <button
                  type="button"
                  role="switch"
                  aria-label={text(
                    "separate_modes",
                    "Separate settings for light and dark mode",
                  )}
                  aria-checked={value.separate}
                  className={styles.switch}
                  onClick={() => update({ separate: !value.separate })}
                >
                  <span />
                </button>
              </Row>
            </div>
            <div className={styles.group}>
              <Row title={text("contrast", "Contrast")}>
                <input
                  className={styles.contrastRange}
                  type="range"
                  min="0"
                  max="100"
                  aria-label={text("contrast", "Contrast")}
                  value={value.contrast}
                  onChange={(event) =>
                    update({ contrast: Number(event.target.value) })
                  }
                />
                <output>{value.contrast}</output>
              </Row>
            </div>
            <div className={styles.group}>
              <Row
                title={text("diff_markers", "Code difference markers")}
                description={text(
                  "diff_markers_help",
                  "Show code changes with colors or +/− markers.",
                )}
              >
                <SegmentedControl
                  label={text("diff_markers", "Code difference markers")}
                  value={value.diff}
                  onChange={(diff) =>
                    update({ diff: diff as Appearance["diff"] })
                  }
                  options={[
                    { value: "color", label: text("color", "Color") },
                    { value: "markers", label: "+/−" },
                  ]}
                />
              </Row>
            </div>
            <div ref={languageRow} className={styles.languageTarget}>
              <Section title={text("language_region", "Language & region")}>
                <div className={styles.group}>
                  <Row title={text("interface_language", "Interface language")}>
                    <Select
                      aria-label={text(
                        "interface_language",
                        "Interface language",
                      )}
                      value={lang}
                      onChange={(event) =>
                        void changeLanguage(event.target.value)
                      }
                    >
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
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {importing && (
        <ThemeImportDialog
          onClose={() => setImporting(false)}
          onImport={(source) => {
            const next = importTheme(source, value);
            transitionTheme(() => {
              setValue(next.appearance);
              saveAppearance(next.appearance);
              const nextMode = next.mode || next.variant;
              if (nextMode) {
                setMode(nextMode);
                applyAccountTheme(nextMode);
              }
              if (next.language) void changeLanguage(next.language);
              setError("");
            }, importButton.current);
            notify(text("theme_imported", "Theme imported"));
          }}
        />
      )}
      {toast && (
        <ThemeToast
          key={toast.id}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}

function ThemeImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (source: string) => void;
}) {
  const { text } = useAccountText();
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onClose, 180);
    return () => clearTimeout(timer);
  }, [closing, onClose]);
  return (
    <WorkspaceDialog
      title={text("import_theme", "Import theme")}
      onClose={() => setClosing(true)}
      className={`${styles.dialog} ${styles.themeImport} ${closing ? styles.themeImportClosing : ""}`}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onImport(source);
            setClosing(true);
          } catch {
            setError(
              text(
                "theme_paste_error",
                "Paste a valid theme code or Genyxo JSON under 20 KB.",
              ),
            );
          }
        }}
      >
        <label htmlFor="theme-source" className={styles.importLabel}>
          {text("theme_code", "Theme code")}
        </label>
        <textarea
          id="theme-source"
          autoFocus
          rows={3}
          maxLength={20000}
          value={source}
          placeholder="genyxo-theme"
          aria-invalid={!!error}
          aria-describedby={error ? "theme-import-error" : undefined}
          onChange={(event) => {
            setSource(event.target.value);
            setError("");
          }}
        />
        {error && (
          <p id="theme-import-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.formFooter}>
          <Action onClick={() => setClosing(true)}>
            {text("cancel", "Cancel")}
          </Action>
          <Action primary type="submit" disabled={!source.trim() || closing}>
            {text("import_theme", "Import theme")}
          </Action>
        </div>
      </form>
    </WorkspaceDialog>
  );
}

function ThemeToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  const { text } = useAccountText();
  const [closing, setClosing] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  useTopLayer(layer, true);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => close.current(), 180);
    return () => clearTimeout(timer);
  }, [closing]);
  return createPortal(
    <div
      ref={layer}
      popover="manual"
      role="status"
      className={`${styles.themeToast} ${closing ? styles.themeToastClosing : ""}`}
    >
      <WorkspaceIcon name="check" size={18} />
      <span>{message}</span>
      <WorkspaceTooltip side="top" label={text("dismiss", "Dismiss")}>
        <button
          type="button"
          aria-label={text("dismiss", "Dismiss")}
          onClick={() => setClosing(true)}
        >
          <WorkspaceIcon name="close" size={15} />
        </button>
      </WorkspaceTooltip>
    </div>,
    document.body,
  );
}
