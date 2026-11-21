"use client";
import { useEffect, useState } from "react";
import { AvatarNavbar as Navbar } from "@/shared/ui/AvatarNavbar";
import type { AccountDropdownProfile } from "@/shared/ui/account-dropdown";
import { API_BASE_URL } from "@/shared/config";
import { useLanguage } from "@/shared/i18n";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { useSessionProfile } from "./use-session-profile";
import { NavUsername } from "./nav-username";
import { signOutSession } from "./sign-out";
export function AvatarNavbar({
  ready = true,
  disabled = false,
  profile: freshProfile,
  onNavigate,
  onSignOut = signOutSession,
}: {
  ready?: boolean;
  disabled?: boolean;
  profile?: AccountDropdownProfile;
  onNavigate?: (url: string) => void;
  onSignOut?: () => void;
}) {
  const cached = useSessionProfile();
  const profile = freshProfile || cached;
  const { t } = useLanguage();
  const authenticated = Boolean(profile);
  const [unreadCount, setUnreadCount] = useState<number>();
  useEffect(() => {
    if (!authenticated) return;
    const request = new AbortController();
    const load = () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;
      void fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: request.signal,
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            if (!request.signal.aborted && Number.isFinite(data.count))
              setUnreadCount(data.count);
          }
        })
        .catch(() => {});
    };
    const update = (event: Event) => {
      const count = (event as CustomEvent<{ count: number }>).detail?.count;
      if (Number.isFinite(count)) setUnreadCount(count);
    };
    load();
    document.addEventListener("genyxo:unread-count", update);
    document.addEventListener("genyxo:notifications-resync", load);
    return () => {
      request.abort();
      document.removeEventListener("genyxo:unread-count", update);
      document.removeEventListener("genyxo:notifications-resync", load);
    };
  }, [authenticated]);
  return (
    <Navbar
      profile={profile}
      unreadCount={unreadCount}
      disabled={!ready || disabled}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      guest={
        <button
          key="guest"
          type="button"
          disabled={!ready}
          className="login-btn chat-auth-btn"
          id="loginBtn"
          aria-label={t("nav.login", "Register / Login")}
        >
          <WorkspaceIcon name="user" size={18} />
          <NavUsername id="navUsername">
            {t("nav.login", "Register / Login")}
          </NavUsername>
          <span className="gx-mobile-login-label" aria-hidden="true">
            {t("nav.sign_in", "Sign in")}
          </span>
        </button>
      }
    />
  );
}
