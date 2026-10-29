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
import { DeviceIcon, deviceDetails } from "@/shared/ui/DeviceIcon";

import styles from "./ProfilePage.module.css";

export function AccountSecurity({
  account,
  showSessions = false,
  onSessionsChange,
  onHistory,
}: {
  account: Account;
  showSessions?: boolean;
  onSessionsChange?: (value: boolean) => void;
  onHistory?: () => void;
}) {
  const { text } = useAccountText();
  const resource = useAccountResource<Security>("profile/security");
  const [dialog, setDialog] = useState<"password" | "logout" | "all" | null>(
    null,
  );
  const sessions = useAccountResource<
    Array<{
      id: string;
      userAgent: string;
      ip: string;
      createdAt: string;
      lastUsedAt: string;
      current: boolean;
      legacy?: boolean;
    }>
  >("profile/sessions");

  const [revoking, setRevoking] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
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
            {!showSessions && (
              <>
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
              </>
            )}
            {showSessions && (
              <div className={styles.sessionView}>
                {[
                  {
                    legacy: false,
                    title: text("devices", "Devices"),
                    description: text(
                      "active_sessions_help",
                      "Review your signed-in devices and end sessions you do not recognize.",
                    ),
                  },
                  ...(sessions.data?.some(
                    (session) =>
                      session.legacy && !dismissed.includes(session.id),
                  )
                    ? [
                        {
                          legacy: true,
                          title: text("earlier_signins", "Earlier sign-ins"),
                          description: text(
                            "earlier_signins_help",
                            "These older sign-ins have no device ID. They stay separate so you can review and sign out of each one safely.",
                          ),
                        },
                      ]
                    : []),
                ].map((group) => (
                  <Section
                    key={String(group.legacy)}
                    title={group.title}
                    description={group.description}
                  >
                    <div className={styles.group}>
                      <State
                        loading={sessions.loading}
                        error={sessions.error}
                        retry={sessions.refresh}
                      >
                        {sessions.data
                          ?.filter(
                            (session) =>
                              Boolean(session.legacy) === group.legacy &&
                              !dismissed.includes(session.id),
                          )
                          .map((session) => (
                            <Row
                              key={session.id}
                              id={`session-${session.id}`}
                              title={deviceDetails(session.userAgent).name}
                              leading={<DeviceIcon agent={session.userAgent} />}
                              description={`${new Date(session.lastUsedAt).toLocaleString()}${session.ip ? ` · IP ${session.ip}` : ""}`}
                            >
                              <div className={styles.sessionAction}>
                                {session.current && (
                                  <span className={styles.sessionCurrent}>
                                    {text("current_session", "Current session")}
                                  </span>
                                )}
                                <Action
                                  disabled={
                                    session.current || Boolean(revoking)
                                  }
                                  busy={revoking === session.id}
                                  onClick={() => {
                                    setRevoking(session.id);
                                    setError("");
                                    void accountRequest(
                                      `profile/sessions/${session.id}/revoke`,
                                      { method: "POST" },
                                    )
                                      .then(async () => {
                                        const row = document.getElementById(
                                          `session-${session.id}`,
                                        );
                                        const motion =
                                          document.documentElement.dataset
                                            .gxMotion;
                                        const reduced =
                                          motion === "on" ||
                                          (motion !== "off" &&
                                            matchMedia(
                                              "(prefers-reduced-motion: reduce)",
                                            ).matches);
                                        if (row && !reduced) {
                                          const geometry =
                                            getComputedStyle(row);
                                          await row
                                            .animate(
                                              [
                                                {
                                                  height: `${row.getBoundingClientRect().height}px`,
                                                  opacity: 1,
                                                  paddingTop:
                                                    geometry.paddingTop,
                                                  paddingBottom:
                                                    geometry.paddingBottom,
                                                  minHeight: "0",
                                                  overflow: "hidden",
                                                },
                                                {
                                                  height: "0",
                                                  opacity: 0,
                                                  paddingTop: "0",
                                                  paddingBottom: "0",
                                                  minHeight: "0",
                                                  overflow: "hidden",
                                                },
                                              ],
                                              {
                                                duration: 180,
                                                easing: "ease-in-out",
                                                fill: "forwards",
                                              },
                                            )
                                            .finished.catch(() => {});
                                        }
                                        setDismissed((previous) => [
                                          ...previous,
                                          session.id,
                                        ]);
                                      })
                                      .catch((failure) =>
                                        setError(failure.message),
                                      )
                                      .finally(() => setRevoking(null));
                                  }}
                                >
                                  {text("sign_out", "Sign out")}
                                </Action>
                              </div>
                            </Row>
                          ))}
                      </State>
                    </div>
                  </Section>
                ))}
              </div>
            )}
            <Section title={text("sessions", "Sessions")}>
              <div className={styles.group}>
                {!showSessions && (
                  <Row
                    title={text("active_sessions", "Active sessions")}
                    description={text(
                      "active_sessions_help",
                      "Review your signed-in devices and end sessions you do not recognize.",
                    )}
                  >
                    <Action
                      label={text("active_sessions", "Active sessions")}
                      onClick={() => onSessionsChange?.(true)}
                    >
                      {sessions.data?.filter(
                        (session) => !dismissed.includes(session.id),
                      ).length ?? "—"}
                      <WorkspaceIcon name="chevron" size={16} />
                    </Action>
                  </Row>
                )}
                {!showSessions && (
                  <Row
                    title={text("security_history", "Security history")}
                    description={text(
                      "security_history_help",
                      "Review when and where you signed in.",
                    )}
                  >
                    <Action
                      label={text("security_history", "Security history")}
                      onClick={onHistory}
                    >
                      <WorkspaceIcon name="chevron" size={16} />
                    </Action>
                  </Row>
                )}
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
          </>
        )}
      </State>
      {error && !dialog && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
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
