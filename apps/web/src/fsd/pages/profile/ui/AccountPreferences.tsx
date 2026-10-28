"use client";
import { Select } from "@/shared/ui/Select";
import { useEffect, useState, type FormEvent } from "react";
import { LANGUAGE_NAMES, LANGUAGES } from "@/shared/i18n";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { workspaceRequest } from "@/features/workspace";
import { useAccountResource, type Preferences } from "../model/account";
import { Action, Row, Section, State, useAccountText } from "./account-ui";
import styles from "./ProfilePage.module.css";

export function AccountPreferences({
  onDirty,
  onBusy,
}: {
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
}) {
  const resource = useAccountResource<Preferences>(
    "chat/workspace/preferences",
  );
  return (
    <State
      loading={resource.loading}
      error={resource.error}
      retry={resource.refresh}
    >
      {resource.data && (
        <PreferencesForm
          initial={resource.data}
          onDirty={onDirty}
          onBusy={onBusy}
        />
      )}
    </State>
  );
}

function PreferencesForm({
  initial,
  onDirty,
  onBusy,
}: {
  initial: Preferences;
  onDirty: (dirty: boolean) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { text } = useAccountText();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState({
    ...initial,
    responseLanguage:
      initial.responseLanguage === "ru" ? "auto" : initial.responseLanguage,
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [timezones, setTimezones] = useState<string[]>([
    initial.timezone || "UTC",
  ]);
  const dirty = [
    "memory",
    "timezone",
    "responseLanguage",
    "customInstructions",
  ].some(
    (key) =>
      draft[key as keyof Preferences] !== saved[key as keyof Preferences],
  );
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  useEffect(() => {
    queueMicrotask(() =>
      setTimezones(
        Array.from(
          new Set([
            "UTC",
            initial.timezone,
            ...Intl.supportedValuesOf("timeZone"),
          ]),
        ).filter(Boolean),
      ),
    );
  }, [initial.timezone]);
  const update = (patch: Partial<Preferences>) => {
    setDraft((old) => ({ ...old, ...patch }));
    setFeedback("");
  };
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusy(true);
    setError("");
    setFeedback("");
    try {
      const value = await workspaceRequest<Preferences>("preferences", {
        method: "PATCH",
        body: JSON.stringify({
          memory: draft.memory,
          timezone: draft.timezone,
          customInstructions: draft.customInstructions,
          responseLanguage: draft.responseLanguage,
        }),
      });
      setSaved(value);
      setDraft(value);
      setFeedback(text("preferences_saved", "Preferences saved"));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : text("save_error", "Your changes couldn’t be saved. Try again."),
      );
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <form onSubmit={save} noValidate>
      <Section
        title={text("responses", "Made for your way of thinking")}
        description={text(
          "responses_help",
          "Shape how Genyxo responds across your conversations.",
        )}
      >
        <div className={styles.group}>
          <Row
            title={text("response_language", "Response language")}
            description={text(
              "response_language_help",
              "You can always ask for another language in a chat.",
            )}
          >
            <Select
              aria-label={text("response_language", "Response language")}
              value={draft.responseLanguage || "auto"}
              disabled={busy}
              onChange={(event) =>
                update({ responseLanguage: event.target.value })
              }
            >
              <option value="auto">{text("automatic", "Automatic")}</option>
              {LANGUAGES.map((lang) => (
                <option value={lang} key={lang}>
                  {LANGUAGE_NAMES[lang]}
                </option>
              ))}
            </Select>
          </Row>
          <div className={styles.instructions}>
            <div className={styles.instructionsTitle}>
              <label htmlFor="account-instructions">
                {text("instructions", "Custom instructions")}
              </label>
              <button
                type="button"
                disabled={!draft.customInstructions || busy}
                className={styles.textButton}
                onClick={() => update({ customInstructions: "" })}
              >
                {text("clear", "Clear")}
              </button>
            </div>
            <p id="instructions-help">
              {text(
                "instructions_help",
                "Tell Genyxo about your preferred tone, format or level of detail.",
              )}
            </p>
            <textarea
              id="account-instructions"
              maxLength={1500}
              rows={6}
              value={draft.customInstructions || ""}
              disabled={busy}
              aria-describedby="instructions-help instructions-count"
              placeholder={text(
                "instructions_placeholder",
                "For example: Be concise, use practical examples, and explain technical terms.",
              )}
              onChange={(event) =>
                update({ customInstructions: event.target.value })
              }
            />
            <small id="instructions-count">
              {draft.customInstructions?.length || 0} / 1,500
            </small>
          </div>
        </div>
      </Section>
      <Section title={text("context", "Context & memory")}>
        <div className={styles.group}>
          <Row
            title={text("memory", "Use saved memories")}
            description={text(
              "memory_help",
              "Let Genyxo use facts you’ve saved in memory. Turning this off keeps your saved memories.",
            )}
          >
            <button
              type="button"
              role="switch"
              aria-checked={draft.memory !== false}
              aria-label={text("memory", "Use saved memories")}
              disabled={busy}
              className={styles.switch}
              onClick={() => update({ memory: draft.memory === false })}
            >
              <span />
            </button>
          </Row>
          <Row
            title={text("timezone", "Time zone")}
            description={text(
              "timezone_help",
              "Used for scheduled tasks and dates in your workspace.",
            )}
          >
            <Select
              aria-label={text("timezone", "Time zone")}
              value={draft.timezone}
              disabled={busy}
              onChange={(event) => update({ timezone: event.target.value })}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </Row>
        </div>
      </Section>
      <div className={styles.saveBar}>
        <span role="status" className={styles.saveStatus}>
          {feedback && (
            <>
              <WorkspaceIcon name="check" size={17} />
              {feedback}
            </>
          )}
          {dirty && text("unsaved", "You have unsaved changes")}
        </span>
        {dirty && (
          <Action
            disabled={busy}
            onClick={() => {
              setDraft(saved);
              setError("");
            }}
          >
            {text("cancel", "Cancel")}
          </Action>
        )}
        <Action primary type="submit" busy={busy} disabled={!dirty}>
          {text("save_preferences", "Save preferences")}
        </Action>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export type Theme = "system" | "light" | "dark";
export function applyAccountTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    /* Theme works without persistence. */
  }
  const light =
    theme === "light" ||
    (theme === "system" && !matchMedia("(prefers-color-scheme: dark)").matches);
  if (light) document.documentElement.dataset.theme = "light";
  else document.documentElement.removeAttribute("data-theme");
}

export { AccountAppearance } from "./AccountAppearance";
