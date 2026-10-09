"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function DashboardAdminNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className="admin-navbar animate-item">
      {"\n        "}
      <div className="nav-left">
        {"\n            "}
        <button
          disabled={!ready}
          className="sidebar-toggle-btn"
          id="sidebarToggle"
          aria-label="Open Menu"
        >
          {"\n                "}
          <i className="fas fa-bars"></i>
          {"\n            "}
        </button>
        {"\n            "}
        <a
          href="/index.html"
          style={{ textDecoration: "none", color: "#fff", display: "flex" }}
        >
          {"\n            "}
          <div className="nav-logo">
            {"\n                "}
            <img src="/images/logo.svg" width="30" height="30" alt="Logo" />
            {"\n                "}
            <span>
              {"Genyxo "}
              <span style={{ color: "#10e6cc" }}>{"Admin"}</span>
            </span>
            {"\n            "}
          </div>
          {"\n            "}
        </a>
        {"\n        "}
      </div>
      {"\n        \n        "}
      <div className="nav-right">
        {"\n            "}
        <div className="profile-container">
          {"\n\n                "}
          <button
            disabled={!ready}
            className="profile-toggle-btn"
            id="profileToggle"
            aria-label="Login / Signup"
          >
            {"\n                    "}
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=User"
              className="nav-avatar-small"
              id="navAvatarImg"
              alt="Avatar"
            />
            {"\n                "}
          </button>
          {"\n                \n                "}
          <div className="profile-dropdown glass-card" id="profileDropdown">
            {"\n                    "}
            <button
              disabled={!ready}
              className="close-profile-panel"
              aria-label="Close Profile Dropdown"
              id="closeProfilePanel"
            >
              {"✕"}
            </button>
            {"\n                    \n                    "}
            <div className="dropdown-header">
              {"\n                        "}
              <div className="user-details">
                {"\n                            "}
                <img
                  src=""
                  alt="Avatar"
                  className="avatar-big dropdown-avatar"
                  id="dropdownAvatars"
                />
                {"\n                            "}
                <div className="user-text">
                  {"\n                                "}
                  <h3 id="menuName">{"Loading..."}</h3>
                  {"\n                                "}
                  <p id="menuEmail">{"loading@gmail.com"}</p>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="credits-card">
              {"\n                        "}
              <div className="credits-top">
                {"\n                            "}
                <div className="credits-amount">
                  {"\n                                "}
                  <span className="icon-flask">{"🪙"}</span>
                  {"\n                                "}
                  <span className="amount-number" id="menuCredits">
                    {"0"}
                  </span>
                  {"\n                                "}
                  <i
                    className="fas fa-info-circle info-icon"
                    id="openFaqBtn"
                    title="Details"
                  ></i>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="credits-meta">
                {
                  "\n                            Available Balance\n                        "
                }
              </div>
              {"\n                        "}
              <a
                href="/index.html#products"
                style={{ textDecoration: "none" }}
                aria-label="Buy Credits"
              >
                {"\n                            "}
                <button
                  disabled={!ready}
                  className="upgrade-full-btn"
                  aria-label="Buy Credits"
                >
                  {"Buy Credits"}
                </button>
                {"\n                        "}
              </a>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="dropdown-menu">
              {"\n                        "}
              <a
                href="/profile.html"
                className="menu-item"
                aria-label="Profile"
              >
                {"\n                            "}
                <i className="fas fa-user-cog"></i> <span>{"Profile"}</span>
                {"\n                        "}
              </a>
              {"\n\n                        "}
              <a
                href="/notifications.html"
                className="menu-item"
                id="menuNotificationsLink"
                style={{ justifyContent: "space-between" }}
                aria-label="Notifications"
              >
                {"\n                            "}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {"\n                                "}
                  <i className="fas fa-bell"></i>
                  {" \n                                "}
                  <Localized
                    as="span"
                    translationKey="menu.notifications"
                    data-i18n="menu.notifications"
                  >
                    {"Notifications"}
                  </Localized>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <span
                  id="notificationBadge"
                  className="nav-badge"
                  style={{ display: "none" }}
                >
                  {"0"}
                </span>
                {"\n                        "}
              </a>
              {"\n\n                        "}
              <a
                href="/support.html"
                className="menu-item"
                aria-label="Help Center"
              >
                {"\n                            "}
                <i className="fas fa-question-circle"></i>{" "}
                <span>{"Help Center"}</span>
                {"\n                        "}
              </a>
              {"\n\n                        "}
              <a
                href="mailto:info@genyxo.com"
                className="menu-item"
                aria-label="Contact Us"
              >
                {"\n                            "}
                <i className="fas fa-envelope"></i>{" "}
                <Localized
                  as="span"
                  translationKey="menu.contact"
                  data-i18n="menu.contact"
                >
                  {"Contact us"}
                </Localized>
                {"\n                            "}
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
                {"\n                        "}
              </a>
              {"\n\n                    "}
            </div>
            {"\n\n                    "}
            <div className="dropdown-footer">
              {"\n                        "}
              <button
                disabled={!ready}
                className="menu-item logout-item"
                aria-label="Log out"
                id="dropdownLogoutBtn"
              >
                {"\n                            "}
                <i className="fas fa-sign-out-alt"></i> <span>{"Log out"}</span>
                {"\n                        "}
              </button>
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
