"use client";
import { useEffect, useRef } from "react";
import { useLanguage } from "@/shared/i18n";
import { WorkspaceIcon, WorkspaceMenu } from "./workspace";
import { Avatar } from "./Avatar";
import styles from "./account-dropdown.module.css";

export type AccountDropdownProfile = {
  name?: string;
  email: string;
  avatar?: string;
  credits: number | string;
  role?: string;
};
type Props = {
  profile?: AccountDropdownProfile | null;
  trigger?: HTMLElement | null;
  onClose?: () => void;
  onNavigate?: (url: string) => void;
  onSignOut?: () => void;
  unreadCount?: number;
};
/** Shared account menu used by every signed-in navbar. */
export function AccountDropdown({
  profile,
  trigger,
  onClose = () => {},
  onNavigate,
  onSignOut,
  unreadCount,
}: Props) {
  const { t, lang } = useLanguage();
  const first = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      first.current?.focus({ preventScroll: true }),
    );
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", escape);
    };
  }, [onClose]);
  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    url: string,
  ) => {
    if (
      !onNavigate ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    onClose();
    onNavigate(url);
  };
  const links = [
    ["/profile#profile", "user", t("account.profile", "Profile")],
    ["/notifications", "bell", t("menu.notifications", "Notifications")],
    ["/support", "help", t("account.help_support", "Help & support")],
    ["/profile#language", "globe", t("menu.language", "Language")],
    ["mailto:info@genyxo.com", "mail", t("menu.contact", "Contact us")],
  ];
  const content = (
    <>
      <div className={styles.identity}>
        <Avatar
          name={profile?.name || profile?.email || "G"}
          src={profile?.avatar}
          size={40}
        />
        <div>
          <strong>{profile?.name || "—"}</strong>
          <small>{profile?.email || ""}</small>
        </div>
      </div>
      <div className={styles.balance}>
        <a
          href="/profile#billing"
          onClick={(event) => navigate(event, "/profile#billing")}
          className={styles.amount}
          aria-label={t("account.billing", "Credits & billing")}
        >
          <WorkspaceIcon name="gem" size={20} />
          <strong>
            {new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(
              Number(profile?.credits || 0),
            )}
          </strong>
        </a>
        <span>{t("account.available_credits", "Available credits")}</span>
        <a
          className={styles.buy}
          href="/#products"
          onClick={(event) => navigate(event, "/#products")}
        >
          {t("account.buy_credits", "Buy credits")}
        </a>
      </div>
      {links.map(([url, icon, label], index) => (
        <a
          ref={index === 0 ? first : undefined}
          role="menuitem"
          key={url}
          href={url}
          onClick={(event) => navigate(event, url)}
          className={styles.item}
        >
          <WorkspaceIcon name={icon} size={19} />
          <span>{label}</span>
          {icon === "bell" && Boolean(unreadCount) && (
            <span className={styles.badge}>
              {unreadCount! > 99 ? "99+" : unreadCount}
            </span>
          )}
        </a>
      ))}
      {profile?.role === "admin" && (
        <a
          role="menuitem"
          className={styles.item}
          href="/admin"
          onClick={(event) => navigate(event, "/admin")}
        >
          <WorkspaceIcon name="settings" size={19} />
          {t("account.admin_dashboard", "Admin dashboard")}
        </a>
      )}
      <div className={styles.divider} />
      <button
        type="button"
        role="menuitem"
        className={`${styles.item} ${styles.logout}`}
        onClick={onSignOut}
      >
        <WorkspaceIcon name="logout" size={19} />
        <span>{t("account.sign_out", "Sign out")}</span>
      </button>
    </>
  );
  return (
    <WorkspaceMenu trigger={trigger} className={styles.menu} onClose={onClose}>
      {content}
    </WorkspaceMenu>
  );
}
