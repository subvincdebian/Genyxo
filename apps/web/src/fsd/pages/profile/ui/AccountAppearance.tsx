"use client";
import { useEffect, useRef, useState } from "react";
import {
  defaultAppearance,
  readAppearance,
  saveAppearance,
  presets,
  parseAppearance,
  type Appearance,
  type Palette,
} from "@/shared/lib/appearance";
import { useLanguage, LANGUAGES, LANGUAGE_NAMES } from "@/shared/i18n";
import { Select } from "@/shared/ui/Select";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { Action, Row, Section, useAccountText } from "./account-ui";
import { applyAccountTheme, type Theme } from "./AccountPreferences";
import styles from "./ProfilePage.module.css";
export function AccountAppearance() {
  const { text } = useAccountText();
  const { lang, changeLanguage } = useLanguage();
  const [value, setValue] = useState<Appearance>(defaultAppearance);
  const [mode, setMode] = useState<Theme>("system");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    queueMicrotask(() => {
      setValue(readAppearance());
      setMode((localStorage.getItem("theme") || "system") as Theme);
    });
  }, []);
  const light =
    mode === "light" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      !matchMedia("(prefers-color-scheme:dark)").matches);
  const key = light ? "light" : "dark";
  const palette = value[key];
  function update(patch: Partial<Appearance>) {
    const next = { ...value, ...patch };
    setValue(next);
    saveAppearance(next);
    setFeedback("");
  }
  function colors(patch: Partial<Palette>) {
    const next = { ...palette, ...patch };
    update({
      [key]: next,
      ...(!value.separate
        ? {
            [light ? "dark" : "light"]: {
              ...value[light ? "dark" : "light"],
              ...(patch.accent ? { accent: patch.accent } : {}),
            },
          }
        : {}),
    });
  }
  function preset(name: string) {
    const p = presets[name];
    update(
      value.separate
        ? {
            [key]: {
              preset: name,
              accent: p.accent,
              background: light ? p.light : p.dark,
              foreground: light ? "#171c1a" : "#f3f5f4",
            },
          }
        : {
            light: {
              preset: name,
              accent: p.accent,
              background: p.light,
              foreground: "#171c1a",
            },
            dark: {
              preset: name,
              accent: p.accent,
              background: p.dark,
              foreground: "#f3f5f4",
            },
          },
    );
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
      setFeedback(text("theme_copied", "Theme copied"));
    } catch {
      setError(text("theme_copy_error", "Copy failed. Try again."));
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20000) throw Error();
      const parsed = JSON.parse(await file.text());
      if (!parsed.light || !parsed.dark) throw Error();
      const next = parseAppearance(parsed);
      setValue(next);
      saveAppearance(next);
      setError("");
      setFeedback(text("theme_imported", "Theme imported"));
    } catch {
      setError(
        text(
          "theme_import_error",
          "Choose a valid Genyxo theme JSON file under 20 KB.",
        ),
      );
    } finally {
      if (input.current) input.current.value = "";
    }
  }
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
                <button
                  type="button"
                  role="radio"
                  aria-label={text(
                    option,
                    option[0].toUpperCase() + option.slice(1),
                  )}
                  aria-checked={mode === option}
                  key={option}
                  onClick={() => {
                    setMode(option);
                    applyAccountTheme(option);
                  }}
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
              ))}
            </div>
          </Row>
        </div>
      </Section>
      <Section title={text("theme", "Color theme")}>
        <div className={styles.group}>
          <Row title={text("preset", "Theme preset")}>
            <div className="gx:flex gx:items-center gx:gap-2">
              <button
                type="button"
                className={styles.iconButton}
                aria-label={text("import_theme", "Import theme")}
                title={text("import_theme", "Import theme")}
                onClick={() => input.current?.click()}
              >
                <WorkspaceIcon name="upload" size={17} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={text("copy_theme", "Copy theme")}
                title={text("copy_theme", "Copy theme")}
                onClick={() => void copy()}
              >
                <WorkspaceIcon name="copy" size={17} />
              </button>
              <Select
                aria-label={text("preset", "Theme preset")}
                value={palette.preset}
                onChange={(event) => preset(event.target.value)}
              >
                {Object.keys(presets).map((name) => (
                  <option value={name} key={name}>
                    {name}
                  </option>
                ))}
              </Select>
              <input
                hidden
                ref={input}
                type="file"
                accept="application/json,.json"
                aria-label={text("import_theme", "Import theme")}
                onChange={(event) => void upload(event.target.files?.[0])}
              />
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
      <details className={styles.appearanceAdvanced} open>
        <summary>{text("advanced", "Advanced")}</summary>
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
          <Row title={text("reduce_motion", "Reduce motion")}>
            <Select
              aria-label={text("reduce_motion", "Reduce motion")}
              value={value.motion}
              onChange={(event) =>
                update({ motion: event.target.value as Appearance["motion"] })
              }
            >
              <option value="system">{text("system", "System")}</option>
              <option value="on">{text("on", "On")}</option>
              <option value="off">{text("off", "Off")}</option>
            </Select>
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
          <Row
            title={text("diff_markers", "Code difference markers")}
            description={text(
              "diff_markers_help",
              "Show code changes with colors or +/− markers.",
            )}
          >
            <Select
              aria-label={text("diff_markers", "Code difference markers")}
              value={value.diff}
              onChange={(event) =>
                update({ diff: event.target.value as Appearance["diff"] })
              }
            >
              <option value="color">{text("color", "Color")}</option>
              <option value="markers">+/−</option>
            </Select>
          </Row>
        </div>
      </details>
      <Section title={text("language_region", "Language & region")}>
        <div className={styles.group}>
          <Row title={text("interface_language", "Interface language")}>
            <Select
              aria-label={text("interface_language", "Interface language")}
              value={lang}
              onChange={(event) => void changeLanguage(event.target.value)}
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
      <div className={styles.appearanceReset}>
        <Action
          onClick={() => {
            setValue(defaultAppearance);
            saveAppearance(defaultAppearance);
          }}
        >
          {text("reset_appearance", "Reset appearance")}
        </Action>
        <span role="status">{feedback}</span>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );
}
