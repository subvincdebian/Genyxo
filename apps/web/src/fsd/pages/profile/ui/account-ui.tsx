"use client";
import { useState, type ReactNode } from "react";
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
export function Avatar({
  name,
  src,
  large = false,
}: {
  name: string;
  src?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className={`${styles.avatar} ${large ? styles.avatarLarge : ""}`}>
      {src && failed !== src ? (
        <img
          src={src}
          onError={() => setFailed(src)}
          alt=""
          width={large ? 80 : 36}
          height={large ? 80 : 36}
        />
      ) : (
        <span>{name.slice(0, 1).toLocaleUpperCase()}</span>
      )}
    </span>
  );
}
