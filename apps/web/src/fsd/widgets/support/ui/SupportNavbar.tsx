"use client";
import type { SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function SupportNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className="navbar">
      {"\n        "}
      <div className="nav-container">
        {"\n            "}
        <div className="nav-logo">
          {"\n                "}
          <a
            href="/index.html"
            aria-label="Home Page"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
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
              translationKey="nav.back_home"
              href="/index.html"
              className="nav-link active"
              data-i18n="nav.back_home"
              aria-label="Back To Home"
            >
              {"Back To Home"}
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
          {"\n                "}
          <div className="profile-container">
            {"\n                    "}
            <button
              disabled={!ready}
              className="login-btn"
              id="loginBtn"
              aria-label="Register / Login"
            >
              {"\n                        "}
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                width="40"
                height="40"
                className="nav-avatar-small"
                id="navAvatar"
                style={{ display: "none" }}
                alt="Avatar"
              />
              {"\n                        "}
              <i className="fas fa-user" id="navIcon"></i>
              {"\n                        "}
              <NavUsername id="navUsername" data-i18n="nav.login">
                {"Register / Login"}
              </NavUsername>
              {"\n                    "}
            </button>
            {"\n                    \n                    "}
            <div className="profile-dropdown glass" id="profilePanel">
              {"\n                        "}
              <button
                disabled={!ready}
                className="close-profile-panel"
                id="closeProfilePanel"
                aria-label="Close Profile Dropdown"
              >
                {"✕"}
              </button>
              {"\n                        \n                        "}
              <div className="dropdown-header">
                {"\n                            "}
                <div className="user-details">
                  {"\n                                "}
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                    alt="Avatar"
                    width="48"
                    height="48"
                    className="avatar-big dropdown-avatar"
                  />
                  {"\n                                "}
                  <div className="user-text">
                    {"\n                                    "}
                    <h3 id="menuName">{"Loading..."}</h3>
                    {"\n                                    "}
                    <p id="menuEmail">{"loading@email.com"}</p>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div className="credits-card">
                {"\n                            "}
                <div className="credits-top">
                  {"\n                                "}
                  <div className="credits-amount">
                    {"\n                                    "}
                    <span className="icon-flask">{"🪙"}</span>
                    {"\n                                    "}
                    <span className="amount-number" id="menuCredits">
                      {"70"}
                    </span>
                    {"\n                                    "}
                    <i
                      className="fas fa-info-circle info-icon"
                      id="openFaqBtn"
                      title="Details"
                    ></i>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <a
                  href="/index.html#products"
                  style={{ textDecoration: "none" }}
                  aria-label="Buy Credits"
                >
                  {"\n                                "}
                  <button
                    disabled={!ready}
                    className="upgrade-full-btn"
                    aria-label="Buy Credits"
                  >
                    {"Buy Credits"}
                  </button>
                  {"\n                            "}
                </a>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div className="dropdown-menu">
                {"\n\n                            "}
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
                {"\n\n                            "}
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
                {"\n\n                            "}
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
                {"\n\n                            "}
                <a href="#" className="menu-item" aria-label="Change Language">
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
                  <Localized
                    as="span"
                    translationKey="menu.language"
                    className="lang-val"
                    id="currentLangDisplay"
                  >
                    {"English >"}
                  </Localized>
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
                {"\n                            \n                        "}
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
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
