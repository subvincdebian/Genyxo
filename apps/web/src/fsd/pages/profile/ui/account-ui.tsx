"use client";
import { type ReactNode } from "react";
import { Avatar as SharedAvatar } from "@/shared/ui/Avatar";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { useLanguage } from "@/shared/i18n";
import { AccountError } from "../model/account";
import styles from "./ProfilePage.module.css";

export function useAccountText() {
  const { t, lang } = useLanguage();
  return {
    text: (key: string, fallback: string) => t(`account.${key}`, fallback),
    lang,
  };
}
export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Row({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  icon?: string;
}) {
  return (
    <div className={styles.row}>
      {icon && (
        <span className={styles.rowIcon}>
          <WorkspaceIcon name={icon} />
        </span>
      )}
      <div className={styles.rowLabel}>
        <span>{title}</span>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.rowControl}>{children}</div>
    </div>
  );
}
export function Action({
  children,
  onClick,
  primary = false,
  danger = false,
  disabled = false,
  type = "button",
  busy = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  busy?: boolean;
}) {
  return (
    <button
      type={type}
      className={`${styles.button} ${primary ? styles.primary : ""} ${danger ? styles.danger : ""}`}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
    >
      {busy && <span className={styles.spinner} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
export function State({
  loading,
  error,
  retry,
  empty,
  children,
}: {
  loading?: boolean;
  error?: Error | null;
  retry?: () => void;
  empty?: string;
  children?: ReactNode;
}) {
  const { text } = useAccountText();
  if (loading)
    return (
      <div className={styles.state} role="status">
        <span className={styles.spinner} />
        {text("loading", "Loading your account…")}
      </div>
    );
  if (error)
    return (
      <div className={styles.state} role="alert">
        <WorkspaceIcon name="info" />
        <strong>
          {error instanceof AccountError && error.status === 401
            ? text("signin_needed", "Sign in to manage your account")
            : text("load_error", "We couldn’t load this section")}
        </strong>
        <p>
          {error instanceof AccountError && error.status === 401
            ? text(
                "signin_description",
                "Your session may have expired. Sign in to continue.",
              )
            : text("retry_description", "Check your connection and try again.")}
        </p>
        {error instanceof AccountError && error.status === 401 ? (
          <a className={styles.button} href="/sign-in">
            {text("signin", "Sign in")}
          </a>
        ) : (
          <Action onClick={retry}>{text("retry", "Try again")}</Action>
        )}
      </div>
    );
  if (empty)
    return (
      <div className={styles.state}>
        <span className={styles.emptyIcon}>
          <WorkspaceIcon name="clock" size={24} />
        </span>
        <p>{empty}</p>
        {children}
      </div>
    );
  return children;
}
export { ProfileAvatar as Avatar };
function ProfileAvatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string;
  large?: boolean;
}) {
  return (
    <SharedAvatar
      name={name}
      src={src}
      size={large ? 80 : 36}
      className={large ? styles.avatarLarge : undefined}
    />
  );
}

// Consistent outline geometry and literal metaphors for settings navigation.
export function AccountNavIcon({ section }: { section: string }) {
  const paths: Record<string, ReactNode> = {
    profile: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9" r="3" />
        <path d="M5.5 18c.7-3 3-4.5 6.5-4.5s5.8 1.5 6.5 4.5" />
      </>
    ),
    personalization: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="9" cy="7" r="3" fill="var(--gx-bg)" />
        <circle cx="15" cy="17" r="3" fill="var(--gx-bg)" />
      </>
    ),
    appearance: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </>
    ),
    security: (
      <>
        <path d="m12 3 8 3v6c0 4-4.5 7.5-8 9-3.5-1.5-8-5-8-9V6l8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </>
    ),
    billing: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    usage: <path d="M4 3v17h17M8 15v-4m5 4V6m5 9V9" />,
    referrals: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" />
      </>
    ),
  };
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[section]}
    </svg>
  );
}
