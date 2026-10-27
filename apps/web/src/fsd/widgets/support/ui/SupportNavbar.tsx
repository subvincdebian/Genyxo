"use client";
import type { SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";

import { Localized } from "@/shared/i18n";
import styles from "./SupportNavbar.module.css";

// The platform controller (features/platform/model/script.js) fills and
// toggles this markup by id: loginBtn, navAvatar, navIcon, navUsername,
// profilePanel (.show), menuName, menuEmail, menuCredits, notificationBadge,
// dropdownLogoutBtn and the .dropdown-avatar image.
export function SupportNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className={styles.bar} aria-label="Main">
      <div className={styles.inner}>
        <a href="/" className={styles.brand} aria-label="Home Page">
          <img
            src="/images/logo.svg"
            width="28"
            height="28"
            fetchPriority="high"
            alt=""
          />
          <span>Genyxo</span>
        </a>
        <div className={styles.actions}>
          <div className={styles.links}>
            <Localized
              as="a"
              translationKey="nav.back_home"
              href="/"
              className={styles.link}
              data-i18n="nav.back_home"
            >
              {"Back To Home"}
            </Localized>
            <Localized
              as="a"
              translationKey="nav.chat"
              href="/chat"
              className={styles.link}
              data-i18n="nav.chat"
            >
              {"Chat"}
            </Localized>
          </div>
          <div className={styles.account}>
            <button
              type="button"
              disabled={!ready}
              className={styles.accountButton}
              id="loginBtn"
              aria-label="Account"
            >
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                width="26"
                height="26"
                className={styles.avatar}
                id="navAvatar"
                style={{ display: "none" }}
                alt=""
              />
              <i className="fas fa-user" id="navIcon" aria-hidden="true"></i>
              <NavUsername id="navUsername" data-i18n="nav.login">
                {"Register / Login"}
              </NavUsername>
            </button>
            <div className={styles.panel} id="profilePanel">
              <button
                type="button"
                disabled={!ready}
                className={styles.panelClose}
                id="closeProfilePanel"
                aria-label="Close Profile Dropdown"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
              <div className={styles.user}>
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt=""
                  width="40"
                  height="40"
                  className={`${styles.userAvatar} dropdown-avatar`}
                />
                <div className={styles.userText}>
                  <h3 id="menuName">{"Loading..."}</h3>
                  <p id="menuEmail">{"loading@email.com"}</p>
                </div>
              </div>
              <div className={styles.credits}>
                <span className={styles.creditsAmount}>
                  <span aria-hidden="true">{"🪙"}</span>
                  <span id="menuCredits">{"70"}</span>
                </span>
                <a href="/#products" className={styles.creditsButton}>
                  {"Buy Credits"}
                </a>
              </div>
              <div className={styles.menu}>
                <a href="/profile.html" className={styles.item}>
                  <i className="fas fa-user-cog" aria-hidden="true"></i>
                  <Localized
                    as="span"
                    translationKey="menu.profile"
                    data-i18n="menu.profile"
                  >
                    {"Profile"}
                  </Localized>
                </a>
                <a
                  href="/notifications.html"
                  className={styles.item}
                  id="menuNotificationsLink"
                >
                  <i className="fas fa-bell" aria-hidden="true"></i>
                  <Localized
                    as="span"
                    translationKey="menu.notifications"
                    data-i18n="menu.notifications"
                  >
                    {"Notifications"}
                  </Localized>
                  <span
                    id="notificationBadge"
                    className={styles.badge}
                    style={{ display: "none" }}
                  >
                    {"0"}
                  </span>
                </a>
                <a href="/support.html" className={styles.item}>
                  <i className="fas fa-question-circle" aria-hidden="true"></i>
                  <Localized
                    as="span"
                    translationKey="menu.help"
                    data-i18n="menu.help"
                  >
                    {"Help Center"}
                  </Localized>
                </a>
                {/* The page controller opens #langModal for this item. */}
                <a href="#" className={styles.item}>
                  <i className="fas fa-globe" aria-hidden="true"></i>
                  <Localized
                    as="span"
                    translationKey="menu.language"
                    data-i18n="menu.language"
                  >
                    {"Language"}
                  </Localized>
                </a>
                <a href="mailto:info@genyxo.com" className={styles.item}>
                  <i className="fas fa-envelope" aria-hidden="true"></i>
                  <Localized
                    as="span"
                    translationKey="menu.contact"
                    data-i18n="menu.contact"
                  >
                    {"Contact us"}
                  </Localized>
                  <i
                    className={`fas fa-arrow-up-right-from-square ${styles.trailing}`}
                    aria-hidden="true"
                  ></i>
                </a>
              </div>
              <button
                type="button"
                disabled={!ready}
                className={`${styles.item} ${styles.logout}`}
                id="dropdownLogoutBtn"
              >
                <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                <Localized
                  as="span"
                  translationKey="menu.logout"
                  data-i18n="menu.logout"
                >
                  {"Log out"}
                </Localized>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
