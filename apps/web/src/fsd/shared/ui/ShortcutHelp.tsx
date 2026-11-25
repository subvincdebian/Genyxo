"use client";
import { useSyncExternalStore } from "react";
import {
  SHORTCUTS,
  getInteractions,
  getServerInteractions,
  subscribeInteractions,
} from "@/shared/lib/interaction-settings";
import { WorkspaceDialog } from "./workspace";
import { Keys } from "./Keys";
import { useLanguage } from "@/shared/i18n";
import styles from "./ShortcutHelp.module.css";

/** Every enabled shortcut, grouped as on the Keyboard settings page. */
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { settings } = useSyncExternalStore(subscribeInteractions, getInteractions, getServerInteractions);
  const { t } = useLanguage();
  const groups = [...new Set(SHORTCUTS.map((item) => item.group))];
  return (
    <WorkspaceDialog title={t("account.keyboard_shortcuts", "Keyboard shortcuts")} onClose={onClose} wide className={styles.dialog}>
      <div className={styles.grid}>
        {groups.map((group) => {
          const items = SHORTCUTS.filter((item) => item.group === group && settings.shortcuts[item.id]?.enabled);
          if (!items.length) return null;
          return (
            <section key={group} className={styles.group}>
              <h3>{t(`account.shortcut_group_${group.toLowerCase().replaceAll(" ", "_")}`, group)}</h3>
              {items.map((item) => (
                <div key={item.id} className={styles.row}>
                  <span>{t(`account.shortcut_${item.id}`, item.title)}</span>
                  <Keys binding={settings.shortcuts[item.id].binding} size="sm" />
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <footer className={styles.footer}>
        <span>{t("account.shortcut_mac_note", "On a Mac, Ctrl also works as ⌘.")}</span>
        <a href="/profile#keyboard">{t("account.customize_shortcuts", "Customize keyboard shortcuts")}</a>
      </footer>
    </WorkspaceDialog>
  );
}
