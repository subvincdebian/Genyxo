"use client";
import { useEffect, useRef, useState } from "react";
import { WorkspaceDialog, WorkspaceIcon } from "@/shared/ui/workspace";
import { AvatarNavbar } from "@/entities/session";
import { useLocalizedMetadata } from "@/shared/i18n";
import { signOut, useAccountResource, type Account } from "../model/account";
import { AccountOverview } from "./AccountOverview";
import {
  AccountAppearance,
  AccountPreferences,
  applyAccountTheme,
  type Theme,
} from "./AccountPreferences";
import { AccountSecurity } from "./AccountSecurity";
import {
  AccountBilling,
  AccountReferrals,
  AccountUsage,
} from "./AccountActivity";
import { Action, AccountNavIcon, State, useAccountText } from "./account-ui";
import styles from "./ProfilePage.module.css";

const sections = [
  {
    id: "profile",
    icon: "user",
    title: "Profile",
    description: "Manage your personal details.",
  },
  {
    id: "personalization",
    icon: "sparkles",
    title: "Personalization",
    description: "A little more you in every conversation.",
  },
  {
    id: "appearance",
    icon: "settings",
    title: "Appearance",
    description: "Make Genyxo feel right at home on your screen.",
  },
  {
    id: "security",
    icon: "lock",
    title: "Security",
    description: "Keep your account and access in your hands.",
  },
  {
    id: "billing",
    icon: "wallet",
    title: "Credits & billing",
    description: "Your balance and every credit, accounted for.",
  },
  {
    id: "usage",
    icon: "chart",
    title: "Usage",
    description: "A clear view of how you use Genyxo.",
  },
  {
    id: "referrals",
    icon: "branch",
    title: "Referrals",
    description: "Share your discovery. Bring someone along.",
  },
] as const;
type SectionId = (typeof sections)[number]["id"];
const sectionFromHash = () =>
  sections.find((item) => item.id === location.hash.slice(1))?.id || "profile";

export function ProfilePage() {
  useLocalizedMetadata("profile.title", "profile.description");
  const { text, lang } = useAccountText();
  const account = useAccountResource<Account>("profile");
  const [active, setActive] = useState<SectionId>("profile");
  const [search, setSearch] = useState("");
  const [shortcut, setShortcut] = useState("Ctrl K");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const current = sections.find((item) => item.id === active)!;
  const labels = (id: string, fallback: string) => text(id, fallback);
  useEffect(() => {
    const selection = (localStorage.getItem("theme") || "system") as Theme;
    applyAccountTheme(selection);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      if (!localStorage.getItem("theme")) applyAccountTheme("system");
    };
    media.addEventListener("change", syncTheme);
    queueMicrotask(() => {
      setActive(sectionFromHash());
      setShortcut(navigator.platform.includes("Mac") ? "⌘ K" : "Ctrl K");
    });
    return () => media.removeEventListener("change", syncTheme);
  }, []);
  useEffect(() => {
    const sync = () => {
      const next = sectionFromHash();
      if (saving) {
        history.replaceState(null, "", `#${active}`);
        return;
      }
      if (dirty && next !== active) {
        setPending(next);
        history.replaceState(null, "", `#${active}`);
      } else setActive(next);
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("beforeunload", unload);
    };
  }, [active, dirty, saving]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  function navigate(destination: string, discard = false) {
    if (saving) return;
    if (destination === active) return;
    if (dirty && !discard) {
      setPending(destination);
      return;
    }
    setDirty(false);
    setPending(null);
    setSaved(false);
    if (destination === "signout") {
      signOut();
      return;
    }
    if (destination.startsWith("/")) {
      location.assign(destination);
      return;
    }
    const next =
      sections.find((item) => item.id === destination)?.id || "profile";
    history.pushState(null, "", `#${next}`);
    setActive(next);
    window.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
  }
  const visible = sections.filter((item) =>
    labels(item.id, item.title)
      .toLocaleLowerCase(lang)
      .includes(search.toLocaleLowerCase(lang)),
  );
  return (
    <div className={styles.page}>
      <a
        href="#account-content"
        className={styles.skip}
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("account-content")?.focus();
        }}
      >
        {text("skip_content", "Skip to content")}
      </a>
      <header className={styles.topbar}>
        <div>
          <a
            href="/chat"
            className={styles.brand}
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                navigate("/chat");
              }
            }}
          >
            <img src="/images/logo.svg" alt="" width="27" height="27" />
            <span>Genyxo</span>
          </a>
          <span className={styles.topDivider} />
          <span className={styles.topLabel}>
            {text("settings", "Settings")}
          </span>
          <a
            className={styles.backLink}
            href="/chat"
            onClick={(event) => {
              if (dirty) {
                event.preventDefault();
                navigate("/chat");
              }
            }}
          >
            <WorkspaceIcon name="arrow-left" size={17} />
            <span>{text("back_chat", "Back to chat")}</span>
          </a>
          {account.data && (
            <AvatarNavbar
              profile={account.data}
              disabled={saving}
              onNavigate={(url) =>
                navigate(url.startsWith("/profile#") ? url.split("#")[1] : url)
              }
              onSignOut={() => {
                if (dirty) navigate("signout");
                else signOut();
              }}
            />
          )}
        </div>
      </header>
      <div className={styles.layout}>
        <aside
          className={styles.sidebar}
          aria-label={text("settings_navigation", "Settings navigation")}
        >
          <div className={styles.sidebarIntro}>
            <h2>{text("settings", "Settings")}</h2>
          </div>
          <label className={styles.search}>
            <WorkspaceIcon name="search" size={17} />
            <input
              ref={searchInput}
              type="search"
              placeholder={text("search_settings", "Search settings")}
              aria-label={text("search_settings", "Search settings")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd>{shortcut}</kbd>
          </label>
          <nav className={styles.navigation}>
            {visible.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                data-group-break={item.id === "billing" ? "" : undefined}
                aria-disabled={saving}
                aria-current={active === item.id ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(item.id);
                }}
              >
                <AccountNavIcon section={item.id} />
                <span>{labels(item.id, item.title)}</span>
              </a>
            ))}
            {!visible.length && (
              <p className={styles.hint}>
                {text("no_settings", "No matching settings")}
              </p>
            )}
          </nav>
          <div className={styles.sidebarBottom}>
            <a
              className={styles.supportLink}
              href="/support"
              onClick={(event) => {
                if (dirty) {
                  event.preventDefault();
                  navigate("/support");
                }
              }}
            >
              <WorkspaceIcon name="help" size={18} />
              {text("help_support", "Help & support")}
              <WorkspaceIcon name="external" size={14} />
            </a>
          </div>
        </aside>
        <div className={styles.mobileNavigation}>
          <label htmlFor="account-section">
            {text("settings", "Settings")}
          </label>
          <select
            id="account-section"
            disabled={saving}
            value={active}
            onChange={(event) => navigate(event.target.value)}
          >
            {sections.map((item) => (
              <option key={item.id} value={item.id}>
                {labels(item.id, item.title)}
              </option>
            ))}
          </select>
        </div>
        <main id="account-content" className={styles.main} tabIndex={-1}>
          <div className={styles.pageHeading}>
            <h1 tabIndex={-1} ref={heading}>
              {labels(current.id, current.title)}
            </h1>
            <p>{text(`${current.id}_description`, current.description)}</p>
          </div>
          <div key={active} className={styles.content}>
            <State
              loading={account.loading}
              error={account.error}
              retry={account.refresh}
            >
              {account.data && (
                <>
                  {active === "profile" && (
                    <AccountOverview
                      account={account.data}
                      navigate={navigate}
                      onUpdated={() => {
                        account.refresh();
                        setSaved(true);
                      }}
                    />
                  )}
                  {active === "personalization" && (
                    <AccountPreferences onDirty={setDirty} onBusy={setSaving} />
                  )}
                  {active === "appearance" && <AccountAppearance />}
                  {active === "security" && (
                    <AccountSecurity account={account.data} />
                  )}
                  {active === "billing" && (
                    <AccountBilling account={account.data} />
                  )}
                  {active === "usage" && (
                    <AccountUsage account={account.data} />
                  )}
                  {active === "referrals" && <AccountReferrals />}
                </>
              )}
            </State>
          </div>
          <footer className={styles.pageFooter}>
            <img src="/images/logo.svg" alt="" width="15" height="15" />
            <span>{text("footer", "Genyxo · Account settings")}</span>
          </footer>
        </main>
      </div>
      {saved && (
        <div role="status" className={styles.toast}>
          <WorkspaceIcon name="check" size={18} />
          {text("profile_saved", "Profile updated")}
          <button
            aria-label={text("dismiss", "Dismiss")}
            onClick={() => setSaved(false)}
          >
            <WorkspaceIcon name="close" size={16} />
          </button>
        </div>
      )}
      {pending && (
        <WorkspaceDialog
          title={text("discard_question", "Discard your unsaved changes?")}
          className={styles.dialog}
          onClose={() => setPending(null)}
        >
          <p className={styles.dialogDescription}>
            {text("discard_help", "Your preferences haven’t been saved yet.")}
          </p>
          <div className={styles.formFooter}>
            <Action onClick={() => setPending(null)}>
              {text("keep_editing", "Keep editing")}
            </Action>
            <Action danger onClick={() => navigate(pending, true)}>
              {text("discard", "Discard changes")}
            </Action>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
