"use client";
import { useSyncExternalStore } from "react";
import {
  SHORTCUTS,
  formatBinding,
  getInteractions,
  getServerInteractions,
  subscribeInteractions,
} from "@/shared/lib/interaction-settings";
import { WorkspaceDialog } from "./workspace";
import { useLanguage } from "@/shared/i18n";
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { settings } = useSyncExternalStore(
    subscribeInteractions,
    getInteractions,
    getServerInteractions,
  );
  const { t } = useLanguage();
  return (
    <WorkspaceDialog
      title={t("account.keyboard", "Keyboard")}
      onClose={onClose}
    >
      <div
        style={{
          display: "grid",
          gap: 16,
          maxHeight: "55dvh",
          overflow: "auto",
        }}
      >
        {SHORTCUTS.filter((item) => settings.shortcuts[item.id].enabled).map(
          (item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
              }}
            >
              <span>{t(`account.shortcut_${item.id}`, item.title)}</span>
              <kbd
                style={{
                  whiteSpace: "nowrap",
                  color: "var(--gx-muted)",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                {formatBinding(settings.shortcuts[item.id].binding)}
              </kbd>
            </div>
          ),
        )}
      </div>
      <a
        href="/profile#keyboard"
        style={{
          display: "inline-block",
          marginTop: 24,
          color: "var(--gx-text)",
        }}
      >
        {t("account.customize_shortcuts", "Customize keyboard shortcuts")}
      </a>
    </WorkspaceDialog>
  );
}
