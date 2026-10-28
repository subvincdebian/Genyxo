"use client";
import { useRef, useState, type FormEvent } from "react";
import { WorkspaceDialog, WorkspaceIcon } from "@/shared/ui/workspace";
import {
  accountRequest,
  signOut,
  useAccountResource,
  type Account,
  type Security,
} from "../model/account";
import { Action, Row, Section, State, useAccountText } from "./account-ui";
import styles from "./ProfilePage.module.css";

export function AccountSecurity({ account }: { account: Account }) {
  const { text } = useAccountText();
  const resource = useAccountResource<Security>("profile/security");
  const [dialog, setDialog] = useState<"password" | "logout" | "all" | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function revoke() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (dialog === "all")
        await accountRequest("profile/logout-all", { method: "POST" });
      signOut();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : text("save_error", "Your changes couldn’t be saved. Try again."),
      );
      setBusy(false);
    }
  }
  return (
    <>
      <State
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      >
        {resource.data && (
          <>
            <div className={styles.securityIntro}>
              <span className={styles.securityEmblem}>
                <WorkspaceIcon name="lock" size={28} />
              </span>
              <div>
                <h2>{text("security_intro", "Your account, protected")}</h2>
                <p>
                  {text(
                    "security_intro_help",
                    "Manage how you sign in and where you stay signed in.",
                  )}
                </p>
              </div>
            </div>
            <Section title={text("sign_in_methods", "Sign-in methods")}>
              <div className={styles.group}>
                <Row
                  title={text("email", "Email address")}
                  description={account.email}
                >
                  <span className={styles.badge}>
                    <WorkspaceIcon
                      name={resource.data.emailVerified ? "check" : "info"}
                      size={14}
                    />
                    {resource.data.emailVerified
                      ? text("verified", "Verified")
                      : text("not_verified", "Not verified")}
                  </span>
                </Row>
                <Row
                  title={text("password", "Password")}
                  description={
                    resource.data.hasPassword
                      ? text(
                          "password_help",
                          "Use a unique password to keep your account secure.",
                        )
                      : text(
                          "provider_password",
                          "Your sign-in provider manages your password.",
                        )
                  }
                >
                  {resource.data.hasPassword && (
                    <Action onClick={() => setDialog("password")}>
                      {text("change_password", "Change password")}
                    </Action>
                  )}
                </Row>
                {resource.data.providers.map((provider) => (
                  <Row
                    key={provider}
                    title={provider}
                    description={text(
                      "connected_signin",
                      "Connected sign-in provider",
                    )}
                  >
                    <span className={styles.muted}>
                      {text("connected", "Connected")}
                    </span>
                  </Row>
                ))}
              </div>
            </Section>
            <Section title={text("sessions", "Sessions")}>
              <div className={styles.group}>
                <Row
                  title={text("this_session", "This browser")}
                  description={text(
                    "this_session_help",
                    "You’re currently signed in here.",
                  )}
                >
                  <Action
                    onClick={() => {
                      setError("");
                      setDialog("logout");
                    }}
                  >
                    {text("sign_out", "Sign out")}
                  </Action>
                </Row>
                <Row
                  title={text("all_sessions", "Sign out everywhere")}
                  description={text(
                    "all_sessions_help",
                    "End all sessions, including this one. You’ll need to sign in again.",
                  )}
                >
                  <Action
                    danger
                    onClick={() => {
                      setError("");
                      setDialog("all");
                    }}
                  >
                    {text("sign_out_all", "Sign out all devices")}
                  </Action>
                </Row>
              </div>
            </Section>
            <p className={styles.footnote}>
              <WorkspaceIcon name="help" size={16} />
              {text(
                "email_change_help",
                "Need to change your sign-in email?",
              )}{" "}
              <a href="/support">
                {text("contact_support", "Contact support")}
              </a>
            </p>
          </>
        )}
      </State>
      {dialog === "password" && (
        <PasswordDialog onClose={() => setDialog(null)} />
      )}
      {(dialog === "logout" || dialog === "all") && (
        <WorkspaceDialog
          title={
            dialog === "all"
              ? text("sign_out_everywhere_question", "Sign out everywhere?")
              : text("sign_out_question", "Sign out of Genyxo?")
          }
          onClose={() => {
            if (!busy) setDialog(null);
          }}
          className={styles.dialog}
        >
          <p className={styles.dialogDescription}>
            {dialog === "all"
              ? text(
                  "all_sessions_help",
                  "End all sessions, including this one. You’ll need to sign in again.",
                )
              : text(
                  "logout_help",
                  "Your conversations and settings will be here when you return.",
                )}
          </p>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.formFooter}>
            <Action onClick={() => setDialog(null)} disabled={busy}>
              {text("cancel", "Cancel")}
            </Action>
            <Action danger busy={busy} onClick={() => void revoke()}>
              {dialog === "all"
                ? text("sign_out_all", "Sign out all devices")
                : text("sign_out", "Sign out")}
            </Action>
          </div>
        </WorkspaceDialog>
      )}
    </>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const { text } = useAccountText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(form.current!);
    const currentPassword = String(data.get("current"));
    const newPassword = String(data.get("new"));
    const confirmation = String(data.get("confirmation"));
    const invalid = !currentPassword
      ? "current"
      : newPassword.length < 8 ||
          new TextEncoder().encode(newPassword).length > 72 ||
          newPassword === currentPassword
        ? "new"
        : newPassword !== confirmation
          ? "confirmation"
          : null;
    if (invalid) {
      setError(
        text(
          "password_error",
          "Enter your current password and a different new password of at least 8 characters, up to 72 UTF-8 bytes. The new passwords must match.",
        ),
      );
      (form.current?.elements.namedItem(invalid) as HTMLInputElement)?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await accountRequest("profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      signOut();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : text("save_error", "Your changes couldn’t be saved. Try again."),
      );
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={text("change_password", "Change password")}
      onClose={() => {
        if (!busy) onClose();
      }}
      className={styles.dialog}
    >
      <form ref={form} noValidate onSubmit={save} className={styles.form}>
        <p className={styles.dialogDescription}>
          {text(
            "password_signout",
            "Changing your password signs you out on every device.",
          )}
        </p>
        {(
          [
            [
              "current",
              "current_password",
              "Current password",
              "current-password",
            ],
            ["new", "new_password", "New password", "new-password"],
            [
              "confirmation",
              "confirm_password",
              "Confirm new password",
              "new-password",
            ],
          ] as const
        ).map(([name, key, label, complete]) => (
          <label key={name} className={styles.field}>
            {text(key, label)}
            <input
              name={name}
              type={show ? "text" : "password"}
              autoComplete={complete}
              maxLength={128}
              disabled={busy}
              aria-describedby={error ? "password-error" : undefined}
            />
          </label>
        ))}
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={show}
            onChange={(event) => setShow(event.target.checked)}
          />
          {text("show_passwords", "Show passwords")}
        </label>
        {error && (
          <p id="password-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.formFooter}>
          <Action disabled={busy} onClick={onClose}>
            {text("cancel", "Cancel")}
          </Action>
          <Action primary busy={busy} type="submit">
            {text("change_password", "Change password")}
          </Action>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
