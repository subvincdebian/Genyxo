"use client";

import { useLanguage } from "@/shared/i18n";
import { useNotifications } from "../model/use-notifications";

export function NotificationsContent() {
  const { t } = useLanguage();
  const {
    items,
    status,
    actionError,
    reading,
    readingAll,
    markRead,
    markAllRead,
  } = useNotifications();
  const locale = t("notifications.time_format", "en-US");
  function time(createdAt: string) {
    try {
      return new Date(createdAt).toLocaleString(locale);
    } catch {
      return new Date(createdAt).toLocaleString("en-US");
    }
  }

  return (
    <div className="notif-container">
      <div className="header-flex">
        <h1 data-i18n="notifications.header_title">
          <span>{t("notifications.header_title", "Your Notifications")}</span>
        </h1>
        <button
          className="mark-all-btn"
          aria-label="Mark All Read"
          disabled={readingAll || reading.length > 0}
          aria-busy={readingAll}
          onClick={() => {
            void markAllRead(
              t("notifications.confirm_read_all", "Mark all as read?"),
              t("notifications.read_all_success", "All marked as read"),
            );
          }}
        >
          <i className="fas fa-check-double" />{" "}
          <span data-i18n="notifications.mark_all_btn">
            {t("notifications.mark_all_btn", "Mark all read")}
          </span>
        </button>
      </div>
      <div id="notifList" aria-live="polite">
        {status === "loading" && (
          <p
            style={{ textAlign: "center", color: "#666" }}
            data-i18n="notifications.loading"
          >
            {t("notifications.loading", "Loading notifications...")}
          </p>
        )}
        {status === "error" && (
          <p role="alert" style={{ color: "red", textAlign: "center" }}>
            {t("notifications.error_loading", "Error loading data")}
          </p>
        )}
        {status === "ready" && items.length === 0 && (
          <div className="empty-state">
            <i className="far fa-bell-slash" />
            <p>{t("notifications.empty_state", "No notifications yet.")}</p>
          </div>
        )}
        {status === "ready" &&
          items.map((item) => {
            const icon =
              item.type === "SUPPORT"
                ? "fa-headset"
                : item.type === "SYSTEM" || item.title.includes("Payment")
                  ? "fa-wallet"
                  : "fa-bell";
            return (
              <div
                key={item.id}
                className={`notif-card ${item.isRead ? "" : "unread"}`}
                role="button"
                tabIndex={0}
                aria-disabled={
                  item.isRead || reading.includes(item.id) || readingAll
                }
                aria-busy={reading.includes(item.id)}
                onClick={() => {
                  void markRead(item);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void markRead(item);
                  }
                }}
              >
                <div className="notif-icon">
                  <i className={`fas ${icon}`} />
                </div>
                <div className="notif-content">
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  <span className="notif-time">
                    {item.justReceived
                      ? t("notifications.just_now", "Just now")
                      : time(item.createdAt)}
                  </span>
                </div>
              </div>
            );
          })}
        {actionError && (
          <p role="alert" style={{ color: "red", textAlign: "center" }}>
            {t("notifications.error_marking", "Failed to mark notifications.")}
          </p>
        )}
      </div>
    </div>
  );
}
