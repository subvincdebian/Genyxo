"use client";
import type { SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function ChatApp({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="app-container" id="app">
      {"\n        "}
      <aside id="sidebar">
        {"\n            "}
        <div className="sidebar-full" id="sidebarOverlay">
          {"\n                "}
          <div className="sb-header">
            {"\n                    "}
            <div className="sb-logo-area">
              {"\n                        "}
              <div className="logo-circle">
                {"\n                            "}
                <a
                  href="/index.html"
                  aria-label="Genyxo Home"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  {"\n                                "}
                  <img
                    src="/images/logo.svg"
                    width="24"
                    height="24"
                    fetchPriority="high"
                    className="chat-logo-icon"
                    alt="Logo"
                  />
                  {"\n                            "}
                </a>
                {"\n                        "}
              </div>
              {"\n                        "}
              <span>{"Genyxo AI"}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <button
              disabled={!ready}
              className="icon-btn"
              onClick={(event) => dispatch("chat-0", event)}
              data-tooltip="Close Sidebar"
              style={{ border: "none", width: "32px", height: "32px" }}
            >
              {"\n                        "}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M9 3v18"></path>
              </svg>
              {"\n                    "}
            </button>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="sb-actions">
            {"\n                    "}
            <button
              disabled={!ready}
              className="icon-btn new-chat"
              onClick={(event) => dispatch("chat-1", event)}
            >
              {"\n                        "}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14"></path>
              </svg>
              {"\n                        "}
              <Localized
                as="span"
                translationKey="chat.new_chat"
                data-i18n="chat.new_chat"
              >
                {"New Chat"}
              </Localized>
              {"\n                    "}
            </button>
            {"\n                    "}
            <button
              disabled={!ready}
              className="icon-btn"
              data-tooltip="Search"
              id="searchChatsBtn"
            >
              {"\n                        "}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
              {"\n                    "}
            </button>
            {"\n                    "}
            <button
              disabled={!ready}
              className="icon-btn"
              data-tooltip="Archive"
            >
              {"\n                        "}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 8-6 4 6 4V8Z"></path>
                <rect width="14" height="12" x="2" y="6" rx="2"></rect>
              </svg>
              {"\n                    "}
            </button>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="history-container">
            {"\n                    "}
            <div className="history-list" id="historyList">
              {"\n                        "}
              <Localized
                as="div"
                translationKey="chat.no_history"
                style={{
                  fontSize: "0.85rem",
                  color: "#666",
                  padding: "10px 0",
                }}
                data-i18n="chat.no_history"
              >
                {"No messages yet"}
              </Localized>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="sidebar-footer">
            {"\n                    "}
            <div className="settings-wrapper">
              {"\n                        "}
              <div className="gemini-menu glass">
                {"\n                            "}
                <a href="#" className="gemini-menu-item">
                  {"\n                                "}
                  <i className="fas fa-history"></i>
                  {"\n                                "}
                  <span>{"Action History"}</span>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <div className="menu-item-wrapper">
                  {"\n                                "}
                  <a
                    href="#"
                    className="gemini-menu-item"
                    onClick={(event) => dispatch("chat-2", event)}
                  >
                    {" "}
                    <i className="fas fa-magic"></i> <span>{"Theme"}</span>
                    {"\n                                    "}
                    <i className="fas fa-chevron-right chevron-right"></i>
                    {" \n                                "}
                  </a>
                  {"\n\n                                "}
                  <div className="theme-submenu" id="themeMenu">
                    {
                      "\n                                    \n                                    "
                    }
                    <div
                      className="submenu-item"
                      onClick={(event) => dispatch("chat-3", event)}
                      id="theme-system"
                    >
                      {"\n                                        "}
                      <span>{"System"}</span>
                      {"\n                                        "}
                      <i className="fas fa-check check-icon"></i>
                      {"\n                                    "}
                    </div>
                    {"\n\n                                    "}
                    <div
                      className="submenu-item"
                      onClick={(event) => dispatch("chat-4", event)}
                      id="theme-dark"
                    >
                      {"\n                                        "}
                      <span>{"Dark"}</span>
                      {"\n                                        "}
                      <i className="fas fa-check check-icon"></i>
                      {"\n                                    "}
                    </div>
                    {"\n\n                                    "}
                    <div
                      className="submenu-item"
                      onClick={(event) => dispatch("chat-5", event)}
                      id="theme-light"
                    >
                      {"\n                                        "}
                      <span>{"Light"}</span>
                      {"\n                                        "}
                      <i className="fas fa-check check-icon"></i>
                      {"\n                                    "}
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <a href="/support.html" className="gemini-menu-item">
                  {"\n                                "}
                  <i className="fas fa-question-circle"></i>
                  {"\n                                "}
                  <span>{"Help Center"}</span>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <a href="mailto:info@genyxo.com" className="gemini-menu-item">
                  {"\n                                "}
                  <i className="fas fa-question-circle"></i>
                  {"\n                                "}
                  <span>{"Send Feedback"}</span>
                  {"\n                            "}
                </a>
                {"\n                            "}
                <div className="menu-divider"></div>
                {"\n                                "}
                <div className="sb-section" style={{ marginTop: "20px" }}>
                  {"\n                                    "}
                  <h4
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                      paddingLeft: "10px",
                    }}
                  >
                    {"Reference"}
                  </h4>
                  {
                    "\n                                    \n                                    "
                  }
                  <button
                    disabled={!ready}
                    className="sidebar-btn"
                    onClick={(event) => dispatch("chat-6", event)}
                  >
                    {"\n                                        "}
                    <i className="fas fa-shield-alt"></i>
                    {"\n                                        "}
                    <span>{"Privacy Policy"}</span>
                    {"\n                                    "}
                  </button>
                  {
                    "\n                                    \n                                    "
                  }
                  <button
                    disabled={!ready}
                    className="sidebar-btn"
                    onClick={(event) => dispatch("chat-7", event)}
                  >
                    {"\n                                        "}
                    <i className="fas fa-file-contract"></i>
                    {"\n                                        "}
                    <span>{"Terms of Service"}</span>
                    {"\n                                    "}
                  </button>
                  {
                    "\n                                    \n                                    "
                  }
                  <button
                    disabled={!ready}
                    className="sidebar-btn"
                    id="openFaqBtn"
                  >
                    {"\n                                        "}
                    <i className="fas fa-question-circle"></i>
                    {"\n                                        "}
                    <span>{"FAQ"}</span>
                    {"\n                                    "}
                  </button>
                  {"\n                                "}
                </div>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <button
                disabled={!ready}
                className="sidebar-btn settings-trigger"
              >
                {"\n                            "}
                <i className="fas fa-bars"></i>{" "}
                <span className="link-text">{"Menu"}</span>
                {"\n                        "}
              </button>
              {"\n                    "}
            </div>
            {"  \n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="sidebar-mini">
          {"\n                "}
          <div
            className="mini-btn logo-toggle"
            onClick={(event) => dispatch("chat-8", event)}
            data-tooltip="Open Sidebar"
          >
            {"\n                    "}
            <div className="logo-circle">
              {"\n                        "}
              <img
                src="/images/logo.svg"
                width="24"
                height="24"
                fetchPriority="high"
                className="logo-icon mini-sidebar-logo"
                alt="Logo"
              />
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="icon-alt">
              {"\n                        "}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <path d="M9 3v18"></path>
              </svg>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="mini-btn" data-tooltip="New Chat">
            {"\n                    "}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="mini-btn" id="railSearchBtn" data-tooltip="Search">
            {"\n                    "}
            <svg
              className="mini-sidebar-search-btn"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.3-4.3"></path>
            </svg>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {"\n                    "}
            <div className="mini-btn" data-tooltip="Shop">
              {"\n                        "}
              <a className="shop-btn-icon" href="/index.html#products">
                {"   \n                            "}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="8" cy="21" r="1"></circle>
                  <circle cx="19" cy="21" r="1"></circle>
                  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
                </svg>
                {"\n                        "}
              </a>
              {" \n                    "}
            </div>
            {"\n                    "}
            <div className="sidebar-footer">
              {"\n                        "}
              <div className="settings-wrapper" data-tooltip="Menu">
                {"\n                            "}
                <div className="gemini-menu glass">
                  {"\n                                "}
                  <a href="#" className="gemini-menu-item">
                    {"\n                                    "}
                    <i className="fas fa-history"></i>
                    {"\n                                    "}
                    <span>{"Action History"}</span>
                    {"\n                                "}
                  </a>
                  {"\n                                "}
                  <div className="menu-item-wrapper">
                    {"\n                                    "}
                    <a
                      href="#"
                      className="gemini-menu-item"
                      onClick={(event) => dispatch("chat-9", event)}
                    >
                      {" "}
                      <i className="fas fa-magic"></i> <span>{"Theme"}</span>
                      {"\n                                        "}
                      <i className="fas fa-chevron-right chevron-right"></i>{" "}
                    </a>
                    {"\n\n                                    "}
                    <div className="theme-submenu" id="themeMenu">
                      {
                        "\n                                        \n                                        "
                      }
                      <div
                        className="submenu-item"
                        onClick={(event) => dispatch("chat-10", event)}
                        id="theme-system"
                      >
                        {"\n                                            "}
                        <span>{"System"}</span>
                        {"\n                                            "}
                        <i className="fas fa-check check-icon"></i>
                        {"\n                                        "}
                      </div>
                      {"\n\n                                        "}
                      <div
                        className="submenu-item"
                        onClick={(event) => dispatch("chat-11", event)}
                        id="theme-dark"
                      >
                        {"\n                                            "}
                        <span>{"Dark"}</span>
                        {"\n                                            "}
                        <i className="fas fa-check check-icon"></i>
                        {"\n                                        "}
                      </div>
                      {"\n\n                                        "}
                      <div
                        className="submenu-item"
                        onClick={(event) => dispatch("chat-12", event)}
                        id="theme-light"
                      >
                        {"\n                                            "}
                        <span>{"Light"}</span>
                        {"\n                                            "}
                        <i className="fas fa-check check-icon"></i>
                        {"\n                                        "}
                      </div>
                      {"\n                                    "}
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n                                "}
                  <a href="/support.html" className="gemini-menu-item">
                    {"\n                                    "}
                    <i className="fas fa-question-circle"></i>
                    {"\n                                    "}
                    <span>{"Help Center"}</span>
                    {"\n                                "}
                  </a>
                  {"\n                                "}
                  <a href="mailto:info@genyxo.com" className="gemini-menu-item">
                    {"\n                                    "}
                    <i className="fas fa-question-circle"></i>
                    {"\n                                    "}
                    <span>{"Send Feedback"}</span>
                    {"\n                                "}
                  </a>
                  {"\n                                "}
                  <div className="menu-divider"></div>
                  {"\n                                "}
                  <div className="sb-section" style={{ marginTop: "20px" }}>
                    {"\n                                    "}
                    <h4
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        textTransform: "uppercase",
                        marginBottom: "10px",
                        paddingLeft: "10px",
                      }}
                    >
                      {"Reference"}
                    </h4>
                    {
                      "\n                                    \n                                    "
                    }
                    <button
                      disabled={!ready}
                      className="sidebar-btn sidebar-mini-preference-btn"
                      onClick={(event) => dispatch("chat-13", event)}
                    >
                      {"\n                                        "}
                      <i className="fas fa-shield-alt"></i>
                      {"\n                                        "}
                      <span>{"Privacy Policy"}</span>
                      {"\n                                    "}
                    </button>
                    {
                      "\n                                    \n                                    "
                    }
                    <button
                      disabled={!ready}
                      className="sidebar-btn sidebar-mini-preference-btn"
                      onClick={(event) => dispatch("chat-14", event)}
                    >
                      {"\n                                        "}
                      <i className="fas fa-file-contract"></i>
                      {"\n                                        "}
                      <span>{"Terms of Service"}</span>
                      {"\n                                    "}
                    </button>
                    {
                      "\n                                    \n                                    "
                    }
                    <button
                      disabled={!ready}
                      className="sidebar-btn sidebar-mini-preference-btn"
                      id="openFaqBtn"
                    >
                      {"\n                                        "}
                      <i className="fas fa-question-circle"></i>
                      {"\n                                        "}
                      <span>{"FAQ"}</span>
                      {"\n                                    "}
                    </button>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                            "}
                <button
                  disabled={!ready}
                  className="sidebar-btn settings-trigger"
                >
                  {"\n                                "}
                  <i className="fas fa-bars"></i>{" "}
                  <span className="link-text">{"Menu"}</span>
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
      </aside>
      {"\n\n        "}
      <div className="sidebar-overlay" id="sidebar-overlay"></div>
      {"\n\n        "}
      <main className="main-container">
        {"\n            "}
        <header>
          {"\n                "}
          <div className="header-left">
            {"\n                    "}
            <button
              disabled={!ready}
              className="mobile-menu-btn"
              id="sidebarToggle"
              aria-label="Toggle menu"
            >
              {"\n                        "}
              <i className="fa-solid fa-bars-staggered"></i>
              {"\n                    "}
            </button>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div
            className="model-select-wrapper model-selector"
            id="model-selector"
          >
            {"\n                        "}
            <i
              className=" fa-solid fas fa-robot bot-icon-to-hide"
              style={{ color: "#10e6cc" }}
            ></i>
            {"\n\n                        "}
            <div
              className="custom-select"
              id="customModelSelect"
              tabIndex={0}
              aria-haspopup="listbox"
              aria-expanded="false"
            >
              {"\n                            "}
              <span className="current-model-name">{"GPT-4o (40 cr)"}</span>
              {"\n                            "}
              <i className="fas fa-chevron-down caret"></i>
              {"\n                            "}
              <ul className="custom-options" role="listbox"></ul>
              {"\n                        "}
            </div>
            {"\n\n                        "}
            <select
              disabled={!ready}
              id="modelSelect"
              style={{ display: "none" }}
              defaultValue="arcee-ai/trinity-large-preview:free"
            >
              {"\n                            "}
              <option value="arcee-ai/trinity-large-preview:free">
                {"Arcee (Free)"}
              </option>
              {"\n                            "}
              <option value="openai/gpt-oss-120b:free">{"ChatGPT OSS"}</option>
              {"\n                            "}
              <option value="google/gemini-3.5-flash">
                {"Gemini 3.5 Flash"}
              </option>
              {"\n                            "}
              <option value="google/gemini-3.5-live-translate-preview">
                {"Gemini 3.5 Live Translate"}
              </option>
              {"\n                            "}
              <option value="google/gemini-3.1-flash-lite">
                {"Gemini 3.1 Flash"}
              </option>
              {"\n                            "}
              <option value="google/gemini-2.5-pro">{"Gemini 2.5 Pro"}</option>
              {"\n                            "}
              <option value="google/gemini-2.5-flash">
                {"Gemini 2.5 Flash"}
              </option>
              {"\n                            "}
              <option value="google/gemini-2.5-flash-native-audio-preview-12-2025">
                {"Gemini 2.5 Flash Audio"}
              </option>
              {"\n                            "}
              <option value="google/gemini-embedding-2">
                {"Gemini Embedding 2"}
              </option>
              {"\n                            "}
              <option value="google/gemini-robotics-er-1.6-preview">
                {"Gemini Robotics-ER 1.6"}
              </option>
              {"\n                            "}
              <option value="meta-llama/llama-3.3-70b-instruct:free">
                {"Llama 3.3"}
              </option>
              {"\n                            "}
              <option value="qwen/qwen3-next-80b-a3b-instruct:free">
                {"QWEN 3"}
              </option>
              {"\n                            "}
              <option value="google/gemma-4-31b-it:free">{"Gemma 4"}</option>
              {"\n                            "}
              <option value="openai/gpt-5.1">{"ChatGPT-5.1 (150 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-5-mini">{"ChatGPT-5 (70 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-5-nano">
                {"ChatGPT-5 Mini (45 cr)"}
              </option>
              {"\n                            "}
              <option value="openai/gpt-4.1">{"ChatGPT-4.1 (55 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-4.1-mini">
                {"ChatGPT-4 Mini (25 cr)"}
              </option>
              {"\n                            "}
              <option value="openai/gpt-4o">{"ChatGPT-4o (40 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-4o-mini">
                {"ChatGPT-4o Mini (20 cr)"}
              </option>
              {"\n                            "}
              <option value="openai/o1-preview">{"ChatGPT-o1 (100 cr)"}</option>
              {"\n                            "}
              <option value="openai/o3-reasoning">
                {"ChatGPT-o3 Reasoning (150 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-sonnet-4.6">
                {"Claude-Sonnet 4.6 (100 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-sonnet-4.5">
                {"Claude-Sonnet 4.5 (90 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-opus-4.6">
                {"Claude-Opus 4.6 (150 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-opus-4.5">
                {"Claude-Opus 4.5 (140 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-haiku-4.5">
                {"Claude-Haiku 4.5 (50 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-3-haiku">
                {"Claude-Haiku 3 (30 cr)"}
              </option>
              {"\n                            "}
              <option value="openai/dall-e-3">{"DALL-E Image (120 cr)"}</option>
              {"\n                            "}
              <option value="kling-video">{"Kling Video (500 cr)"}</option>
              {"\n                        "}
            </select>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="header-actions">
            {"\n\n                    "}
            <div className="header-right">
              {"\n                        "}
              <div className="credits-display" id="credits-btn">
                {"\n                            "}
                <button
                  disabled={!ready}
                  id="creditsBtn"
                  className="creditsBtn primary"
                  aria-label="Get More Credits"
                  onClick={(event) => dispatch("chat-15", event)}
                  style={{
                    cursor: "default",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    minWidth: "auto",
                    padding: "0.5rem 1rem",
                  }}
                >
                  {"\n                                "}
                  <i className="fas fa-coins" style={{ color: "#ffd700" }}></i>
                  {" \n                                "}
                  <span id="creditBalance">{"0"}</span>
                  {" Credits"}
                  <span className="credits-cta hide-on-mobile credits-text">
                    {" - Get more"}
                  </span>
                  {"\n                            "}
                </button>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div
                className="profile-container profile-trigger"
                id="profile-trigger"
                style={{ display: "flex", gap: "10px", alignItems: "center" }}
              >
                {"\n\n                            "}
                <button
                  disabled={!ready}
                  className="login-btn chat-auth-btn"
                  id="loginBtn"
                  aria-label="Register / Login"
                >
                  {"\n                                "}
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=User"
                    width="40"
                    height="40"
                    className="nav-avatar-small"
                    id="navAvatar"
                    alt="Avatar"
                  />
                  {"\n                                "}
                  <i className="fas fa-user" id="navIcon"></i>
                  {"\n                                "}
                  <NavUsername id="navUsername">
                    {"Register / Login"}
                  </NavUsername>
                  {"\n                            "}
                </button>
                {"\n                            \n                            "}
                <div className="profile-dropdown glass" id="profilePanel">
                  {"\n                                "}
                  <button
                    disabled={!ready}
                    className="close-profile-panel"
                    aria-label="Close Profile Dropdown"
                    id="closeProfilePanel"
                  >
                    {"✕"}
                  </button>
                  {
                    "\n                                \n                                "
                  }
                  <div className="dropdown-header">
                    {"\n                                    "}
                    <div className="user-details">
                      {"\n                                        "}
                      <img
                        src=""
                        alt="Avatar"
                        width="48"
                        height="48"
                        className="avatar-big dropdown-avatar"
                        id="dropdownAvatars"
                      />
                      {"\n                                        "}
                      <div className="user-text">
                        {"\n                                            "}
                        <h3 id="menuName">{"Loading..."}</h3>
                        {"\n                                            "}
                        <p id="menuEmail">{"loading@gmail.com"}</p>
                        {"\n                                        "}
                      </div>
                      {"\n                                    "}
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n\n                                "}
                  <div className="credits-card">
                    {"\n                                    "}
                    <div className="credits-top">
                      {"\n                                        "}
                      <div className="credits-amount">
                        {"\n                                            "}
                        <span className="icon-flask">{"🪙"}</span>
                        {"\n                                            "}
                        <span className="amount-number" id="menuCredits">
                          {"0"}
                        </span>
                        {"\n                                            "}
                        <i
                          className="fas fa-info-circle info-icon"
                          id="openFaqBtn"
                          title="Details"
                        ></i>
                        {"\n                                        "}
                      </div>
                      {"\n                                    "}
                    </div>
                    {"\n                                    "}
                    <div className="credits-meta">
                      {
                        "\n                                        Available Balance\n                                    "
                      }
                    </div>
                    {"\n                                    "}
                    <a
                      href="/index.html#products"
                      style={{ textDecoration: "none" }}
                      aria-label="Buy Credits"
                    >
                      {"\n                                        "}
                      <button
                        disabled={!ready}
                        className="upgrade-full-btn"
                        aria-label="Buy Credits"
                      >
                        {"Buy Credits"}
                      </button>
                      {"\n                                    "}
                    </a>
                    {"\n                                "}
                  </div>
                  {"\n\n                                "}
                  <div className="dropdown-menu">
                    {"\n                                    "}
                    <a
                      href="/profile.html"
                      className="menu-item"
                      aria-label="Profile"
                    >
                      {"\n                                        "}
                      <i className="fas fa-user-cog"></i>{" "}
                      <span>{"Profile"}</span>
                      {"\n                                    "}
                    </a>
                    {"\n\n                                    "}
                    <a
                      href="/notifications.html"
                      className="menu-item"
                      id="menuNotificationsLink"
                      style={{ justifyContent: "space-between" }}
                      aria-label="Notifications"
                    >
                      {"\n                                        "}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {"\n                                            "}
                        <i className="fas fa-bell"></i>
                        {" \n                                            "}
                        <Localized
                          as="span"
                          translationKey="menu.notifications"
                          data-i18n="menu.notifications"
                        >
                          {"Notifications"}
                        </Localized>
                        {"\n                                        "}
                      </div>
                      {"\n                                        "}
                      <span
                        id="notificationBadge"
                        className="nav-badge"
                        style={{ display: "none" }}
                      >
                        {"0"}
                      </span>
                      {"\n                                    "}
                    </a>
                    {"\n\n                                    "}
                    <a
                      href="/support.html"
                      className="menu-item"
                      aria-label="Help Center"
                    >
                      {"\n                                        "}
                      <i className="fas fa-question-circle"></i>{" "}
                      <span>{"Help Center"}</span>
                      {"\n                                    "}
                    </a>
                    {"\n\n                                    "}
                    <a
                      href="#"
                      className="menu-item"
                      aria-label="Change Language"
                    >
                      {"\n                                        "}
                      <i className="fas fa-globe"></i>{" "}
                      <Localized
                        as="span"
                        translationKey="menu.language"
                        data-i18n="menu.language"
                      >
                        {"Language"}
                      </Localized>
                      {"\n                                        "}
                      <Localized
                        as="span"
                        translationKey="menu.language"
                        className="lang-val"
                        id="currentLangDisplay"
                      >
                        {"English >"}
                      </Localized>
                      {"\n                                    "}
                    </a>
                    {"\n\n                                    "}
                    <a
                      href="mailto:info@genyxo.com"
                      className="menu-item"
                      aria-label="Contact Us"
                    >
                      {"\n                                        "}
                      <i className="fas fa-envelope"></i>{" "}
                      <Localized
                        as="span"
                        translationKey="menu.contact"
                        data-i18n="menu.contact"
                      >
                        {"Contact us"}
                      </Localized>
                      {"\n                                        "}
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
                      {"\n                                    "}
                    </a>
                    {"\n\n                                "}
                  </div>
                  {"\n\n                                "}
                  <div className="dropdown-footer">
                    {"\n                                    "}
                    <button
                      disabled={!ready}
                      className="menu-item logout-item"
                      aria-label="Log out"
                      id="dropdownLogoutBtn"
                    >
                      {"\n                                        "}
                      <i className="fas fa-sign-out-alt"></i>{" "}
                      <span>{"Log out"}</span>
                      {"\n                                    "}
                    </button>
                    {"\n                                "}
                  </div>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </header>
        {"\n            "}
        <div id="chatContainer">
          {"\n                "}
          <div className="welcome-container" id="welcomeScreen">
            {"\n                    "}
            <div className="logo-wrapper">
              {"\n                        "}
              <div className="glow-effect"></div>
              {"\n                        "}
              <div className="logo-inner">
                {"\n                            "}
                <img
                  className="welcome-logo-genyxo"
                  src="/images/logo.svg"
                  width="46"
                  height="46"
                  fetchPriority="high"
                  alt="Logo"
                />
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <h1 className="welcome-text">
              {"Hi, I'm "}
              <span className="text-gradient">{"Genyxo"}</span>
            </h1>
            {"\n                    "}
            <p className="welcome-subtext">{"How can I help you today?"}</p>
            {"\n                    "}
            <div className="features-grid">
              {"\n                        "}
              <div
                className="feature-card"
                onClick={(event) => dispatch("chat-16", event)}
              >
                {"\n                            "}
                <i className="fas fa-image cyan-icon"></i>
                {"\n                            "}
                <span>{"Image Generation"}</span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div
                className="feature-card"
                onClick={(event) => dispatch("chat-17", event)}
              >
                {"\n                            "}
                <i className="fas fa-code cyan-icon"></i>
                {"\n                            "}
                <span>{"Code Assistant"}</span>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div
                className="feature-card"
                onClick={(event) => dispatch("chat-18", event)}
              >
                {"\n                            "}
                <i className="fas fa-video cyan-icon"></i>
                {"\n                            "}
                <span>{"Video Creation"}</span>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="messages-container" id="chatBox">
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="typing-indicator" id="typingIndicator">
            {"\n                    "}
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="chat-input-container">
            {"\n                    "}
            <div className="input-wrapper" id="dropZone">
              {"\n                        "}
              <div id="dropOverlay" className="drop-overlay">
                {"\n                            "}
                <div className="drop-message">
                  {"\n                                "}
                  <i className="fas fa-cloud-upload-alt"></i>
                  {" \n                                "}
                  <span>{"Drop the file here"}</span>
                  {"\n                                "}
                  <span>{"Drop up to 5 files (max 50MB)"}</span>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div className="unified-preview-area" id="unifiedPreviewArea">
                {"\n                            "}
                <div className="preview-scroll-container">
                  {"\n                                "}
                  <div id="allPreviewItems" className="all-preview-items"></div>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n\n                        "}
              <div className="input-form-wrapper">
                {"\n                            "}
                <form className="input-form" id="chatForm">
                  {"\n                                "}
                  <div className="attachment-menu" id="attachmentMenu">
                    {"\n                                    "}
                    <label className="plus-menu-item">
                      {"\n                                        "}
                      <i className="fas fa-image cyan-icon"></i>
                      {"\n                                        "}
                      <span className="text-box">{"Add Photo"}</span>
                      {"\n                                        "}
                      <input
                        disabled={!ready}
                        type="file"
                        accept="image/*"
                        multiple={true}
                        hidden={true}
                        id="photoInput"
                      />
                      {"\n                                    "}
                    </label>
                    {"\n                                    "}
                    <label className="plus-menu-item">
                      {"\n                                        "}
                      <i className="fas fa-file-alt cyan-icon"></i>
                      {"\n                                        "}
                      <span className="text-box">{"Add Files"}</span>
                      {"\n                                        "}
                      <input
                        disabled={!ready}
                        type="file"
                        accept=".docx,.pdf,.txt,.html,.htm,.css,.js,.mjs,.cjs,.ts,.jsx,.tsx,.py,.cpp,.cxx,.cc,.c,.h,.hpp,.java,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.json,.xml,.md,.csv,.sql,.sh,.ps1,.yaml,.yml,text/*,application/pdf,application/json"
                        multiple={true}
                        hidden={true}
                        id="fileInput"
                      />
                      {"\n                                    "}
                    </label>
                    {"\n                                "}
                  </div>
                  {"  \n\n                                "}
                  <button
                    disabled={!ready}
                    type="button"
                    className="plus-btn"
                    id="plusBtn"
                    data-tooltip="Add Files"
                  >
                    {"\n                                    "}
                    <i className="fas fa-plus"></i>
                    {"\n                                "}
                  </button>
                  {
                    "\n                                \n                                "
                  }
                  <div className="input-content">
                    {"\n                                    "}
                    <div className="textarea-wrapper">
                      {"\n                                        "}
                      <textarea
                        disabled={!ready}
                        id="userInput"
                        placeholder="Message Genyxo..."
                        rows={1}
                        defaultValue=""
                      />
                      {"\n                                    "}
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n\n                                "}
                  <button
                    disabled={!ready}
                    type="submit"
                    className="send-btn"
                    id="sendBtn"
                  >
                    {"\n                                    "}
                    <i className="fas fa-arrow-up"></i>
                    {"\n                                "}
                  </button>
                  {"\n                            "}
                </form>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="footer-text">
              {"AI is smart, but not perfect. Double-check important info!"}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </main>
      {"\n    "}
    </div>
  );
}
