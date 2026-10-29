"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_INTERACTIONS,
  SHORTCUTS,
  formatBinding,
  getInteractions,
  getServerInteractions,
  shortcutBinding,
  subscribeInteractions,
  updateInteractions,
} from "@/shared/lib/interaction-settings";
import { Action, Row, Section, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountExtensions.module.css";

export function AccountKeyboard() {
  const { text } = useAccountText();
  const { settings, saving, error } = useSyncExternalStore(
    subscribeInteractions,
    getInteractions,
    getServerInteractions,
  );
  const [recording, setRecording] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    if (!recording) return;
    document.documentElement.dataset.gxShortcutRecording = "true";
    const keydown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (
        event.code === "Escape" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        setRecording(null);
        return;
      }
      if (
        ["Control", "Meta", "Shift", "Alt"].includes(event.key) ||
        event.isComposing ||
        event.repeat
      )
        return;
      const binding = shortcutBinding(event);
      if (
        !/^(?:(?:Ctrl|Alt|Shift)\+)*(?:Key[A-Z]|Digit[1-9]|Enter|Escape|Backspace|Delete|Space|Slash|Arrow(?:Up|Down|Left|Right))$/.test(
          binding,
        ) ||
        (!event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.shiftKey &&
          !(recording === "send" && event.code === "Enter"))
      ) {
        setProblem(
          text("shortcut_modifier", "Use Ctrl, Alt or Shift with a key."),
        );
        return;
      }
      if (
        /^Ctrl\+Key[WLNTR]$/.test(binding) ||
        binding === "Alt+ArrowLeft" ||
        binding === "Alt+ArrowRight"
      ) {
        setProblem(
          text(
            "shortcut_reserved",
            "This combination belongs to your browser. Choose another.",
          ),
        );
        return;
      }
      const conflict = SHORTCUTS.find(
        (item) =>
          item.id !== recording &&
          settings.shortcuts[item.id]?.enabled &&
          settings.shortcuts[item.id].binding === binding,
      );
      if (conflict) {
        setProblem(
          `${text("shortcut_used", "Already used by")} “${text(`shortcut_${conflict.id}`, conflict.title)}”.`,
        );
        return;
      }
      void updateInteractions({
        shortcuts: {
          [recording]: {
            binding,
            enabled: settings.shortcuts[recording].enabled,
          },
        },
      });
      setRecording(null);
      setProblem("");
    };
    window.addEventListener("keydown", keydown, true);
    return () => {
      delete document.documentElement.dataset.gxShortcutRecording;
      window.removeEventListener("keydown", keydown, true);
    };
  }, [recording, settings.shortcuts, text]);
  const groups = [...new Set(SHORTCUTS.map((item) => item.group))];
  const changed = SHORTCUTS.some(
    (item) =>
      settings.shortcuts[item.id].binding !== item.binding ||
      !settings.shortcuts[item.id].enabled,
  );
  return (
    <>
      <p className={styles.note}>
        {text(
          "keyboard_help",
          "Select a key combination, then press the new keys. Press Esc to cancel. Ctrl also works as Command on macOS.",
        )}
      </p>
      {groups.map((group) => (
        <Section
          key={group}
          title={text(
            `shortcut_group_${group.toLowerCase().replaceAll(" ", "_")}`,
            group,
          )}
        >
          <div className={page.group}>
            {SHORTCUTS.filter((item) => item.group === group).map((item) => {
              const shortcut = settings.shortcuts[item.id];
              const title = text(`shortcut_${item.id}`, item.title);
              return (
                <Row key={item.id} title={title}>
                  <div className={styles.controls}>
                    <button
                      type="button"
                      role="switch"
                      className={page.switch}
                      aria-label={`${text("enable", "Enable")} ${title}`}
                      aria-checked={shortcut.enabled}
                      disabled={recording !== null}
                      onClick={() =>
                        void updateInteractions({
                          shortcuts: {
                            [item.id]: {
                              ...shortcut,
                              enabled: !shortcut.enabled,
                            },
                          },
                        })
                      }
                    >
                      <span />
                    </button>
                    <button
                      type="button"
                      className={styles.shortcut}
                      aria-label={`${text("change_shortcut", "Change shortcut for")} ${title}`}
                      data-recording={recording === item.id}
                      onClick={() => {
                        setRecording(item.id);
                        setProblem("");
                      }}
                      onBlur={() => setRecording(null)}
                    >
                      {recording === item.id
                        ? text("press_keys", "Press keys…")
                        : formatBinding(shortcut.binding)
                            .split("+")
                            .map((key, i) => (
                              <kbd key={i}>
                                {key}
                                {i <
                                formatBinding(shortcut.binding).split("+")
                                  .length -
                                  1
                                  ? " +"
                                  : ""}
                              </kbd>
                            ))}
                    </button>
                  </div>
                </Row>
              );
            })}
          </div>
        </Section>
      ))}
      {problem && (
        <p className={page.error} role="alert">
          {problem}
        </p>
      )}
      <div className={styles.controls}>
        <span className={styles.note} role="status">
          {saving
            ? text("saving", "Saving…")
            : error ||
              text("saved_automatically", "Changes save automatically.")}
        </span>
        {error && (
          <Action
            onClick={() =>
              void updateInteractions({ shortcuts: settings.shortcuts })
            }
          >
            {text("try_again", "Try again")}
          </Action>
        )}
        <Action
          disabled={!changed || saving}
          onClick={() =>
            void updateInteractions({
              shortcuts: DEFAULT_INTERACTIONS.shortcuts,
            })
          }
        >
          {text("restore_defaults", "Restore default settings")}
        </Action>
      </div>
    </>
  );
}
