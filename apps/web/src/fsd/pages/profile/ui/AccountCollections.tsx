"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { accountRequest } from "../model/account";
import { Action, State, useAccountText } from "./account-ui";
import { DeviceIcon, deviceDetails } from "@/shared/ui/DeviceIcon";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import styles from "./AccountExtensions.module.css";

type Entry = {
  id: string | number;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  title?: string;
  publicId?: string;
};

export function AccountCollection({ kind }: { kind: "history" | "archive" }) {
  const { text, lang } = useAccountText();
  const [items, setItems] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | number | null>(null);
  const anchor = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const offset = useRef(0);
  const load = useCallback(
    async (next: string) => {
      if (lock.current) return;
      lock.current = true;
      setLoading(true);
      setError("");
      try {
        const path =
          kind === "history"
            ? `profile/security-history${next ? `?cursor=${encodeURIComponent(next)}` : ""}`
            : `chat/workspace/conversations?archived=true&limit=15&offset=${offset.current}`;
        const result = await accountRequest<{
          items: Entry[];
          nextCursor?: string | null;
          hasMore?: boolean;
        }>(path);
        offset.current += result.items.length;
        setItems((previous) => [
          ...previous,
          ...result.items.filter(
            (item) => !previous.some((old) => old.id === item.id),
          ),
        ]);
        setCursor(
          kind === "history"
            ? result.nextCursor || null
            : result.hasMore
              ? String(offset.current)
              : null,
        );
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load this page.",
        );
      } finally {
        lock.current = false;
        setLoading(false);
      }
    },
    [kind],
  );
  useEffect(() => {
    void load("");
  }, [load]);
  useEffect(() => {
    if (!anchor.current || loading || error || cursor === null) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void load(cursor);
      },
      { rootMargin: "160px" },
    );
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, [cursor, loading, error, load]);
  const groups = new Map<string, Entry[]>();
  for (const item of items) {
    const date = new Date(item.createdAt).toLocaleDateString(lang, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const key = kind === "history" ? date : "";
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  async function restore(item: Entry) {
    setBusy(item.id);
    setError("");
    try {
      await accountRequest(`chat/workspace/conversations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived: false }),
      });
      setItems((previous) => previous.filter((row) => row.id !== item.id));
      offset.current = Math.max(0, offset.current - 1);
      document.dispatchEvent(new CustomEvent("genyxo:workspace-refresh"));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not restore this chat.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className={styles.collections}>
      {[...groups].map(([date, entries]) => (
        <section key={date}>
          {date && <h2 className={styles.date}>{date}</h2>}
          <div className={styles.list}>
            {entries.map((item) => (
              <div className={styles.entry} key={item.id}>
                <span className={styles.device}>
                  {kind === "history" ? (
                    <DeviceIcon agent={item.userAgent || ""} />
                  ) : (
                    <WorkspaceIcon name="chat" size={22} />
                  )}
                </span>
                <div className={styles.entryText}>
                  {kind === "history" ? (
                    <>
                      <strong>
                        {text("signed_in", "Signed in to Genyxo")}
                      </strong>
                      <p>
                        {deviceDetails(item.userAgent || "").name} ·{" "}
                        {new Date(item.createdAt).toLocaleTimeString(lang, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {item.ip ? ` · IP ${item.ip}` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <a
                        className={styles.chatLink}
                        href={`/c/${item.publicId}`}
                      >
                        {item.title || text("untitled_chat", "Untitled chat")}
                      </a>
                      <p>{new Date(item.createdAt).toLocaleDateString(lang)}</p>
                    </>
                  )}
                </div>
                {kind === "archive" && (
                  <Action
                    label={text("restore_chat", "Restore chat")}
                    disabled={busy !== null}
                    busy={busy === item.id}
                    onClick={() => void restore(item)}
                  >
                    <WorkspaceIcon name="restore" size={18} />
                  </Action>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
      {!loading && !error && items.length === 0 && (
        <div className={styles.empty}>
          <WorkspaceIcon
            name={kind === "history" ? "clock" : "archive"}
            size={30}
          />
          <p>
            {kind === "history"
              ? text("no_security_history", "No sign-in history yet.")
              : text("no_archived_chats", "No archived chats.")}
          </p>
        </div>
      )}
      <State
        loading={loading}
        error={error ? new Error(error) : null}
        retry={() => void load(cursor || "")}
      />
      <div ref={anchor} aria-hidden="true" />
    </div>
  );
}
