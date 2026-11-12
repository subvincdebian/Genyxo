"use client";
import { useCallback, useState, type ReactNode } from "react";
import { useLanguage } from "@/shared/i18n";
import { Avatar } from "./Avatar";
import {
  AccountDropdown,
  type AccountDropdownProfile,
} from "./account-dropdown";
import styles from "./AvatarNavbar.module.css";
export function AvatarNavbar({
  profile,
  disabled = false,
  guest,
  onNavigate,
  onSignOut,
  unreadCount,
}: {
  profile?: AccountDropdownProfile | null;
  disabled?: boolean;
  guest?: ReactNode;
  onNavigate?: (url: string) => void;
  onSignOut: () => void;
  unreadCount?: number;
}) {
  const { t } = useLanguage();
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const close = useCallback(() => setTrigger(null), []);
  return profile ? (
    <>
      <button
        key="account"
        type="button"
        className={styles.trigger}
        disabled={disabled}
        aria-label={t("account.profile_menu", "Profile menu")}
        aria-haspopup="menu"
        aria-expanded={Boolean(trigger)}
        onClick={(event) => setTrigger(trigger ? null : event.currentTarget)}
      >
        <Avatar name={profile.name || profile.email} src={profile.avatar} />
        <span id="navUsername" className={styles.srOnly}>
          {profile.name || profile.email}
        </span>
      </button>
      {trigger && (
        <AccountDropdown
          profile={profile}
          unreadCount={unreadCount}
          trigger={trigger}
          onClose={close}
          onNavigate={onNavigate}
          onSignOut={() => {
            setTrigger(null);
            onSignOut();
          }}
        />
      )}
    </>
  ) : (
    <span className={styles.guest}>{guest}</span>
  );
}
