"use client";
import { useSettingsSidebar } from "../model/use-settings-sidebar";
import { Select } from "@/shared/ui/Select";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  WorkspaceDialog,
  WorkspaceIcon,
  WorkspaceTooltip,
} from "@/shared/ui/workspace";
import { AvatarNavbar } from "@/entities/session";
import { useLocalizedMetadata } from "@/shared/i18n";
import { signOut, useAccountResource, type Account } from "../model/account";
import { AccountOverview } from "./AccountOverview";
import { AccountAppearance, AccountPreferences } from "./AccountPreferences";
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
  location.hash === "#language"
    ? "appearance"
    : sections.find((item) => item.id === location.hash.slice(1))?.id ||
      "profile";

export function ProfilePage() {
  useLocalizedMetadata("profile.title", "profile.description");
  const { text, lang } = useAccountText();
  const account = useAccountResource<Account>("profile");
  const [active, setActive] = useState<SectionId>("profile");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const sidebarSize = useSettingsSidebar(collapsed, setCollapsed);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [securityView, setSecurityView] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const current = sections.find((item) => item.id === active)!;
  const labels = (id: string, fallback: string) => text(id, fallback);
  useEffect(() => {
    queueMicrotask(() => {
      setActive(sectionFromHash());
      setCollapsed(
        localStorage.getItem("genyxo.settings.sidebarCollapsed") === "true",
      );
    });
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
        setCollapsed(false);
        localStorage.setItem("genyxo.settings.sidebarCollapsed", "false");
        requestAnimationFrame(() => searchInput.current?.focus());
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
    setSecurityView(false);
    if (destination === "signout") {
      signOut();
      return;
    }
    if (destination.startsWith("/")) {
      location.assign(destination);
      return;
    }
    const next =
      destination === "language"
        ? "appearance"
        : sections.find((item) => item.id === destination)?.id || "profile";
    history.pushState(
      null,
      "",
      `#${destination === "language" ? "language" : next}`,
    );
    setActive(next);
    if (destination === "language") {
      document.dispatchEvent(new Event("genyxo:focus-language"));
      return;
    }
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
    <div className={`${styles.page} account-appearance-scope`}>
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
      <div
        className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ""} ${sidebarSize.resizing ? styles.layoutResizing : ""}`}
        style={
          {
            "--account-sidebar-width": `${sidebarSize.width}px`,
          } as CSSProperties
        }
      >
        <div className={styles.sidebarFrame}>
          <aside
            className={styles.sidebar}
            aria-label={text("settings_navigation", "Settings navigation")}
          >
            <div className={styles.sidebarIntro}>
              <h2>{text("settings", "Settings")}</h2>
              <WorkspaceTooltip
                label={text(
                  collapsed ? "expand_sidebar" : "collapse_sidebar",
                  collapsed ? "Expand sidebar" : "Collapse sidebar",
                )}
                side="bottom"
              >
                <button
                  type="button"
                  className={styles.sidebarToggle}
                  aria-label={text(
                    collapsed ? "expand_sidebar" : "collapse_sidebar",
                    collapsed ? "Expand sidebar" : "Collapse sidebar",
                  )}
                  aria-expanded={!collapsed}
                  aria-controls="settings-sections"
                  onClick={() => {
                    setCollapsed(!collapsed);
                    localStorage.setItem(
                      "genyxo.settings.sidebarCollapsed",
                      String(!collapsed),
                    );
                  }}
                >
                  <WorkspaceIcon name="panel" size={20} />
                </button>
              </WorkspaceTooltip>
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
            </label>
            <nav id="settings-sections" className={styles.navigation}>
              {visible.map((item, index) => (
                <div key={item.id}>
                  {(index === 0 || item.id === "billing") && (
                    <p className={styles.navGroup}>
                      {text(
                        item.id === "billing"
                          ? "group_activity"
                          : "group_personal",
                        item.id === "billing"
                          ? "Account & activity"
                          : "Personal",
                      )}
                    </p>
                  )}
                  <WorkspaceTooltip
                    disabled={!collapsed}
                    label={labels(item.id, item.title)}
                  >
                    <a
                      href={`#${item.id}`}
                      aria-label={labels(item.id, item.title)}
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
                  </WorkspaceTooltip>
                </div>
              ))}
              {!visible.length && (
                <p className={styles.hint}>
                  {text("no_settings", "No matching settings")}
                </p>
              )}
            </nav>
            <div className={styles.sidebarBottom}>
              <WorkspaceTooltip
                disabled={!collapsed}
                label={text("help_support", "Help & support")}
              >
                <a
                  className={styles.supportLink}
                  aria-label={text("help_support", "Help & support")}
                  href="/support"
                  onClick={(event) => {
                    if (dirty) {
                      event.preventDefault();
                      navigate("/support");
                    }
                  }}
                >
                  <WorkspaceIcon name="help" size={18} />
                  <span>{text("help_support", "Help & support")}</span>
                  <WorkspaceIcon name="external" size={14} />
                </a>
              </WorkspaceTooltip>
            </div>
          </aside>
          <div
            className={styles.sidebarResize}
            role="separator"
            aria-orientation="vertical"
            aria-label={text("resize_sidebar", "Resize settings sidebar")}
            aria-valuemin={64}
            aria-valuemax={360}
            aria-valuenow={collapsed ? 64 : sidebarSize.width}
            tabIndex={0}
            {...sidebarSize.resizeProps}
          />
        </div>
        <div className={styles.mobileNavigation}>
          <label htmlFor="account-section">
            {text("settings", "Settings")}
          </label>
          <Select
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
          </Select>
        </div>
        <main id="account-content" className={styles.main} tabIndex={-1}>
          <div className={styles.pageHeading}>
            {active === "security" && securityView && (
              <div className={styles.sessionBack}>
                <Action onClick={() => setSecurityView(false)}>
                  <WorkspaceIcon name="arrow-left" size={17} />
                  {text("back", "Back")}
                </Action>
              </div>
            )}
            <h1 tabIndex={-1} ref={heading}>
              {active === "security" && securityView
                ? text("active_sessions", "Active sessions")
                : labels(current.id, current.title)}
            </h1>
            <p>
              {active === "security" && securityView
                ? text(
                    "active_sessions_help",
                    "Review your signed-in devices and end sessions you do not recognize.",
                  )
                : text(`${current.id}_description`, current.description)}
            </p>
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
                    <AccountSecurity
                      account={account.data}
                      showSessions={securityView}
                      onSessionsChange={setSecurityView}
                    />
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
