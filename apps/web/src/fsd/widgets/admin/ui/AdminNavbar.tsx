"use client";
import type { SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function AdminNavbar({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className="navbar">
      {"\n        "}
      <div className="nav-container">
        {"\n\n            "}
        <div className="nav-logo">
          {"\n                "}
          <a
            href="/index.html"
            aria-label="Home Page"
            style={{
              textDecoration: "none",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {"\n                    "}
            <img
              src="/images/logo.svg"
              width="40"
              height="40"
              fetchPriority="high"
              className="logo-icon"
              alt="Logo"
            />
            {"\n                    "}
            <span>{"Genyxo"}</span>
            {"\n                "}
          </a>
          {"\n            "}
        </div>
        {"\n            \n            "}
        <div className="right-side">
          {"\n                "}
          <div className="nav-links">
            {"\n                    "}
            <Localized
              as="a"
              translationKey="nav.home"
              href="/index.html"
              className="nav-link"
              data-i18n="nav.home"
              aria-label="Back To Home"
            >
              {"Home"}
            </Localized>
            {"\n                    "}
            <Localized
              as="a"
              translationKey="nav.chat"
              href="/chat.html"
              className="nav-link"
              data-i18n="nav.chat"
              aria-label="Chat Page"
            >
              {"Chat"}
            </Localized>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="profile-container">
            {"\n                    "}
            <button
              disabled={!ready}
              className="login-btn profile-toggle-btn"
              id="loginBtn"
              aria-label="Profile"
            >
              {"\n                        "}
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                className="nav-avatar-small"
                id="navAvatar"
                alt="Avatar"
              />
              {"\n                        "}
              <i
                className="fas fa-user"
                id="navIcon"
                style={{ display: "none" }}
              ></i>
              {"\n                        "}
              <NavUsername id="navUsername">{"Admin"}</NavUsername>
              {"\n                    "}
            </button>
            {"\n                    \n                    "}
            <div className="profile-dropdown glass" id="profilePanel">
              {"\n                        \n                        "}
              <div className="dropdown-header">
                {"\n                            "}
                <div className="user-details">
                  {"\n                                "}
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin"
                    alt="Avatar"
                    className="avatar-big dropdown-avatar"
                  />
                  {"\n                                "}
                  <div className="user-text">
                    {"\n                                    "}
                    <h3 id="menuName">{"Admin User"}</h3>
                    {"\n                                    "}
                    <p id="menuEmail">{"admin@genyxo.com"}</p>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <span className="badge badge-admin">{"ADMIN"}</span>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div className="dropdown-menu">
                {"\n                            "}
                <a
                  href="/profile.html"
                  className="menu-item"
                  aria-label="Profile"
                >
                  {"\n                                "}
                  <i className="fas fa-user-cog"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="menu.profile"
                    data-i18n="menu.profile"
                  >
                    {"Profile"}
                  </Localized>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <a
                  href="/notifications.html"
                  className="menu-item"
                  id="menuNotificationsLink"
                  aria-label="Notifications"
                  style={{ justifyContent: "space-between" }}
                >
                  {"\n                                "}
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {"\n                                    "}
                    <i className="fas fa-bell"></i>
                    {" \n                                    "}
                    <Localized
                      as="span"
                      translationKey="menu.notifications"
                      data-i18n="menu.notifications"
                    >
                      {"Notifications"}
                    </Localized>
                    {"\n                                "}
                  </div>
                  {"\n                                "}
                  <span
                    id="notificationBadge"
                    className="nav-badge"
                    style={{ display: "none" }}
                  >
                    {"0"}
                  </span>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <a
                  href="/support.html"
                  className="menu-item"
                  aria-label="Help Center"
                >
                  {"\n                                "}
                  <i className="fas fa-question-circle"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="menu.help"
                    data-i18n="menu.help"
                  >
                    {"Help Center"}
                  </Localized>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <a
                  href="#"
                  className="menu-item"
                  aria-label="Change Language"
                  onClick={(event) => dispatch("admin-0", event)}
                >
                  {"\n                                "}
                  <i className="fas fa-globe"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="menu.language"
                    data-i18n="menu.language"
                  >
                    {"Language"}
                  </Localized>
                  {"\n                                "}
                  <span className="lang-val">{">"}</span>
                  {"\n                            "}
                </a>
                {"\n\n                            "}
                <a
                  href="mailto:info@genyxo.com"
                  className="menu-item"
                  aria-label="Contact Us"
                >
                  {"\n                                "}
                  <i className="fas fa-envelope"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="menu.contact"
                    data-i18n="menu.contact"
                  >
                    {"Contact us"}
                  </Localized>
                  {"\n                                "}
                  <i
                    className="fas fa-arrow-up-right-from-square"
                    style={{
                      color: "var(--text-gray)",
                      marginLeft: "8px",
                      fontSize: "0.95rem",
                      position: "relative",
                      left: "120px",
                    }}
                    title="Mail us"
                  ></i>
                  {"\n                            "}
                </a>
                {"\n\n                        "}
              </div>
              {"\n\n                        "}
              <div className="dropdown-footer">
                {"\n                            "}
                <button
                  disabled={!ready}
                  className="menu-item logout-item"
                  id="dropdownLogoutBtn"
                  aria-label="Log out"
                >
                  {"\n                                "}
                  <i className="fas fa-sign-out-alt"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="menu.logout"
                    data-i18n="menu.logout"
                  >
                    {"Log out"}
                  </Localized>
                  {"\n                            "}
                </button>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
