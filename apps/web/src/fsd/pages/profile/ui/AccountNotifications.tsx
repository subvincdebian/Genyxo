"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  deliverNotification,
  notificationPermission,
  playNotificationSound,
  requestNotificationPermission,
  type PermissionState,
} from "@/shared/lib/desktop-notify";
import {
  getInteractions,
  getServerInteractions,
  subscribeInteractions,
  updateInteractions,
} from "@/shared/lib/interaction-settings";
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationChannel,
} from "@/shared/lib/notification-settings";
import { MultiSelect } from "@/shared/ui/MultiSelect";
import { WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";
import { Action, Row, Section, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountNotifications.module.css";

const uniqueTag = (prefix: string) => `${prefix}-${Date.now()}`;

function usePermission() {
  const [state, setState] = useState<PermissionState>("default");
  useEffect(() => {
    const sync = () => setState(notificationPermission());
    queueMicrotask(sync);
    let status: PermissionStatus | null = null;
    void navigator.permissions
      ?.query({ name: "notifications" })
      .then((result) => {
        status = result;
        result.onchange = sync;
      })
      .catch(() => undefined);
    // Site settings changed in another window apply when the person returns.
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (status) status.onchange = null;
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  return [state, setState] as const;
}

export function AccountNotifications() {
  const { text } = useAccountText();
  const { settings, saving, error } = useSyncExternalStore(
    subscribeInteractions,
    getInteractions,
    getServerInteractions,
  );
  const [permission, setPermission] = usePermission();
  const [requesting, setRequesting] = useState(false);
  const [tested, setTested] = useState(false);
  const preferences = settings.notifications;

  const channelLabel = (channel: NotificationChannel) =>
    channel === "push"
      ? text("channel_push", "Push notifications")
      : text("channel_email", "Email");
  function setChannel(
    category: NotificationCategory,
    channel: NotificationChannel,
    enabled: boolean,
  ) {
    void updateInteractions({
      notifications: {
        ...preferences,
        categories: {
          ...preferences.categories,
          [category]: { ...preferences.categories[category], [channel]: enabled },
        },
      },
    });
    // Turning push on is the natural moment to ask the browser.
    if (channel === "push" && enabled && permission === "default") void allow();
  }
  async function allow() {
    setRequesting(true);
    const result = await requestNotificationPermission();
    setRequesting(false);
    setPermission(result);
    if (result === "granted") sendTest();
  }
  function sendTest() {
    const shown = deliverNotification({
      category: "test",
      title: text("test_title", "Notifications are on"),
      body: text(
        "test_body",
        "This is how Genyxo will reach you when you are in another tab or app.",
      ),
      tag: uniqueTag("gx-test"),
      url: "/profile#notifications",
    });
    if (shown) {
      setTested(true);
      setTimeout(() => setTested(false), 2400);
    }
  }
  const changed =
    JSON.stringify(preferences) !== JSON.stringify(DEFAULT_NOTIFICATIONS);
  const status =
    permission === "granted"
      ? {
          tone: "on",
          badge: text("permission_granted", "Allowed"),
          title: text("browser_on_title", "Browser notifications are on"),
          body: text(
            "browser_on_body",
            "Genyxo can notify you over other sites and apps while it is open in a tab.",
          ),
        }
      : permission === "denied"
        ? {
            tone: "blocked",
            badge: text("permission_denied", "Blocked"),
            title: text("browser_blocked_title", "Notifications are blocked"),
            body: text(
              "browser_blocked_body",
              "Click the site icon next to the address bar, allow Notifications, then come back to this page.",
            ),
          }
        : permission === "unsupported"
          ? {
              tone: "blocked",
              badge: text("permission_unsupported", "Unavailable"),
              title: text(
                "browser_unsupported_title",
                "This browser can’t show notifications",
              ),
              body: text(
                "browser_unsupported_body",
                "Email notifications still work. Try a recent Chrome, Edge, Firefox or Safari for push.",
              ),
            }
          : {
              tone: "off",
              badge: text("permission_default", "Not enabled"),
              title: text("browser_off_title", "Get notified in your browser"),
              body: text(
                "browser_off_body",
                "Allow notifications to know the moment an answer is ready, even on another site.",
              ),
            };

  return (
    <>
      <div className={styles.permission} data-tone={status.tone}>
        <span className={styles.permissionIcon} aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
            <path d="M10 20a2.2 2.2 0 0 0 4 0" />
            {status.tone === "blocked" && <path d="m4 4 16 16" />}
          </svg>
        </span>
        <div className={styles.permissionText}>
          <div>
            <strong>{status.title}</strong>
            <span className={styles.badge}>{status.badge}</span>
          </div>
          <p>{status.body}</p>
        </div>
        <div className={styles.permissionActions}>
          {permission === "default" && (
            <Action primary busy={requesting} onClick={() => void allow()}>
              {text("allow_notifications", "Allow notifications")}
            </Action>
          )}
          {permission === "granted" && (
            <Action onClick={sendTest}>
              {tested ? (
                <span className={styles.sent}>
                  <WorkspaceIcon name="check" size={16} />
                  {text("test_sent", "Sent")}
                </span>
              ) : (
                text("send_test", "Send a test")
              )}
            </Action>
          )}
          {permission === "denied" && (
            <Action onClick={() => setPermission(notificationPermission())}>
              {text("check_again", "Check again")}
            </Action>
          )}
        </div>
      </div>

      <Section title="Genyxo">
        <div className={page.group}>
          {NOTIFICATION_CATEGORIES.map((category) => {
            const choice = preferences.categories[category.id];
            const title = text(`notify_${category.id}`, category.title);
            return (
              <Row
                key={category.id}
                title={title}
                description={text(
                  `notify_${category.id}_help`,
                  category.description,
                )}
              >
                <MultiSelect
                  label={title}
                  emptyLabel={text("channel_off", "Off")}
                  options={category.channels.map((channel) => ({
                    value: channel,
                    label: channelLabel(channel),
                  }))}
                  values={category.channels.filter(
                    (channel) => choice[channel],
                  )}
                  onToggle={(channel, enabled) =>
                    setChannel(
                      category.id,
                      channel as NotificationChannel,
                      enabled,
                    )
                  }
                />
              </Row>
            );
          })}
        </div>
      </Section>

      <Section title={text("notification_sound_section", "Sound")}>
        <div className={page.group}>
          <Row
            title={text("notification_sound", "Notification sound")}
            description={text(
              "notification_sound_help",
              "Play a soft tick when a notification arrives.",
            )}
          >
            <div className={styles.soundControls}>
              <WorkspaceTooltip
                label={text("preview_sound", "Preview sound")}
                side="top"
              >
                <button
                  type="button"
                  className={styles.play}
                  aria-label={text("preview_sound", "Preview sound")}
                  onClick={(event) => {
                    playNotificationSound();
                    event.currentTarget.dataset.playing = "true";
                    const target = event.currentTarget;
                    setTimeout(() => delete target.dataset.playing, 420);
                  }}
                >
                  <WorkspaceIcon name="volume" size={17} />
                </button>
              </WorkspaceTooltip>
              <button
                type="button"
                role="switch"
                className={page.switch}
                aria-label={text("notification_sound", "Notification sound")}
                aria-checked={preferences.sound}
                onClick={() => {
                  const sound = !preferences.sound;
                  void updateInteractions({
                    notifications: { ...preferences, sound },
                  });
                  if (sound) playNotificationSound();
                }}
              >
                <span />
              </button>
            </div>
          </Row>
        </div>
      </Section>

      <div className={styles.footer}>
        <span role="status">
          {saving
            ? text("saving", "Saving…")
            : error ||
              text(
                "notifications_footer",
                "Changes save to your account. Every notification also appears in your notification center.",
              )}
        </span>
        <div className={styles.footerActions}>
          {error && (
            <Action
              onClick={() =>
                void updateInteractions({ notifications: preferences })
              }
            >
              {text("try_again", "Try again")}
            </Action>
          )}
          <a href="/notifications" className={styles.centerLink}>
            {text("open_notification_center", "Notification center")}
            <WorkspaceIcon name="arrow-right" size={15} />
          </a>
          <button
            type="button"
            className={`${styles.reset} ${changed ? styles.resetVisible : ""}`}
            aria-hidden={!changed}
            tabIndex={changed ? 0 : -1}
            onClick={() =>
              void updateInteractions({ notifications: DEFAULT_NOTIFICATIONS })
            }
          >
            {text("restore_defaults", "Restore default settings")}
          </button>
        </div>
      </div>
    </>
  );
}
