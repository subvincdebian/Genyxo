"use client";
import type { SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function HomeNavbar({
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
        {"\n            "}
        <div className="burger" id="burger">
          {"\n                "}
          <span></span>
          {"\n                "}
          <span></span>
          {"\n                "}
          <span></span>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="left-side">
          {"\n                "}
          <div className="nav-logo">
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
          </div>
          {"\n                    \n                "}
          <div className="search-container">
            {"\n                    "}
            <div className="search-box">
              {"\n                        "}
              <input
                disabled={!ready}
                type="text"
                style={{ display: "none" }}
                autoComplete="username"
              />
              {"\n                        "}
              <input
                disabled={!ready}
                type="password"
                style={{ display: "none" }}
                autoComplete="current-password"
              />
              {"\n                        "}
              <Localized
                disabled={!ready}
                as="input"
                translationKey="nav.search_placeholder"
                type="text"
                className="search-input"
                data-i18n="nav.search_placeholder"
                placeholder="Search products..."
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                name="search-field-xyz"
              />
              {"\n                        \n                        "}
              <button
                disabled={!ready}
                className="search-btn"
                aria-label="Search Button"
              >
                {"\n                            "}
                <i className="fas fa-search"></i>
                {"\n                        "}
              </button>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="search-results-dropdown" id="searchResultsDropdown">
              {"\n    \n                        "}
              <div id="searchDefaultState" className="search-state-view">
                {"\n                            "}
                <div className="search-section-label">{"Popular packs"}</div>
                {"\n                            "}
                <div id="defaultSearchList">
                  {"\n                                "}
                </div>
                {"\n                            \n                            "}
                <div className="search-categories-grid">
                  {"\n                                "}
                  <button
                    disabled={!ready}
                    className="search-category-btn"
                    onClick={(event) => dispatch("home-0", event)}
                  >
                    {"\n                                    "}
                    <i className="fas fa-box"></i>
                    {
                      "\n                                    Credit Packages\n                                "
                    }
                  </button>
                  {"\n                                "}
                  <button
                    disabled={!ready}
                    className="search-category-btn"
                    onClick={(event) => dispatch("home-1", event)}
                  >
                    {"\n                                    "}
                    <i className="fas fa-robot"></i>
                    {
                      "\n                                    AI Models\n                                "
                    }
                  </button>
                  {"\n                                "}
                  <button
                    disabled={!ready}
                    className="search-category-btn"
                    onClick={(event) => dispatch("home-2", event)}
                  >
                    {"\n                                    "}
                    <i className="fas fa-bolt"></i>
                    {
                      "\n                                    Quick Actions\n                                "
                    }
                  </button>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div
                id="searchResultsState"
                className="search-state-view"
                style={{ display: "none" }}
              ></div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="right-side">
          {"\n                "}
          <div className="nav-links">
            {"\n                    "}
            <Localized
              as="a"
              translationKey="nav.home"
              href="#home"
              className="nav-link active"
              data-i18n="nav.home"
              aria-label="Home Page"
            >
              {"Home"}
            </Localized>
            {"\n                    "}
            <Localized
              as="a"
              translationKey="nav.products"
              href="#products"
              className="nav-link"
              data-i18n="nav.products"
              aria-label="Product Section"
            >
              {"Products"}
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
            {"\n                    "}
            <Localized
              as="a"
              translationKey="nav.about"
              href="#about"
              className="nav-link"
              data-i18n="nav.about"
              aria-label="About Us"
            >
              {"About Us"}
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
              {"\n\n                        "}
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
                    <p id="menuEmail">{"loading@gmail.com"}</p>
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
                  style={{ justifyContent: "space-between" }}
                  aria-label="Notifications"
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
                {"\n\n                        "}
              </div>
              {"\n\n                        "}
              <div className="dropdown-footer">
                {"\n                            "}
                <button
                  disabled={!ready}
                  className="menu-item logout-item"
                  aria-label="Log out"
                  id="dropdownLogoutBtn"
                >
                  {"\n                                "}
                  <i className="fas fa-sign-out-alt"></i>{" "}
                  <Localized
                    as="span"
                    translationKey="logout"
                    data-i18n="logout"
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
