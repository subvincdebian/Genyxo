"use client";
import type { ReactNode, SyntheticEvent } from "react";
import { NavUsername } from "@/entities/session";
import { WelcomeGreeting } from "./WelcomeGreeting";
import { ComposerPlusMenu } from "./ComposerPlusMenu";
import { ChatHeaderActions } from "./ChatHeaderActions";
import { VoiceControls, VoiceStage } from "./VoiceMode";
import { GenyxoOrb } from "@/shared/ui/GenyxoOrb";

import { Localized } from "@/shared/i18n";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import "./action-card.css";
export function ChatApp({
  dispatch,
  ready,
  workspace = false,
  isChatRoute = true,
  children,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
  workspace?: boolean;
  isChatRoute?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={`app-container${workspace ? " workspace-chat-app" : ""}${!isChatRoute ? " workspace-other-route" : ""}`} id="app">
      {"\n        "}
      {!workspace && <><aside id="sidebar">
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
                  href="/"
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
          <nav className="workspace-navigation" aria-label="Workspace">
            <button type="button" id="libraryBtn" className="workspace-nav-btn" disabled={!ready}><i className="far fa-images" aria-hidden="true"></i><span>Library</span></button>
          </nav>
          <section className="sidebar-projects" aria-label="Projects">
            <div className="sidebar-projects-header">
              <button type="button" id="projectToggleBtn" className="sidebar-projects-toggle" aria-expanded="true" aria-controls="projectSidebarList"><span>Projects</span><i className="fas fa-chevron-down" aria-hidden="true"></i></button>
              <button type="button" id="projectsBtn" className="sidebar-projects-add" disabled={!ready} aria-label="Create or manage projects" title="Create or manage projects"><i className="fas fa-plus" aria-hidden="true"></i></button>
            </div>
            <div id="projectSidebarList" className="project-sidebar-list" aria-label="Projects"></div>
          </section>
          <div className="history-container">
            <div className="recent-heading">Recent</div>
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
              <a className="shop-btn-icon" href="/#products">
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
      <div className="sidebar-overlay" id="sidebar-overlay"></div></>}
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
              id={workspace ? "workspaceMobileToggle" : "sidebarToggle"}
              aria-label={workspace ? "Open navigation" : "Toggle menu"}
              onClick={workspace ? () => document.dispatchEvent(new CustomEvent("genyxo:workspace-toggle")) : undefined}
            >
              {"\n                        "}
              {workspace ? <WorkspaceIcon name="panel"/> : <i className="fa-solid fa-bars-staggered"></i>}
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
            <div
              className="custom-select"
              id="customModelSelect"
              tabIndex={0}
              aria-haspopup="listbox"
              aria-expanded="false"
            >
              {"\n                            "}
              <span className="current-model-name">{"Gemini 3.5 Flash-Lite"}</span>
              {"\n                            "}
              {workspace ? <span className="caret gx-caret"><WorkspaceIcon name="chevron-down" size={16} /></span> : <i className="fas fa-chevron-down caret"></i>}
              {"\n                            "}
              <div className="model-picker-menu">
                <div className="model-picker-tabs" role="tablist" aria-label="Creation mode">
                  <button type="button" data-mode="chat" role="tab" aria-selected="true">Chat</button>
                  <button type="button" data-mode="image" role="tab" aria-selected="false">Image</button>
                  <button type="button" data-mode="video" role="tab" aria-selected="false">Video</button>
                </div>
                <input className="model-picker-search" type="search" placeholder="Search models" aria-label="Search models" />
                <ul className="custom-options" role="listbox" aria-label="Compatible models"></ul>
              </div>
              {"\n                        "}
            </div>
            {"\n\n                        "}
            <select
              disabled={!ready}
              id="modelSelect"
              style={{ display: "none" }}
              defaultValue="google/gemini-3.5-flash-lite"
            >
              {"\n                            "}
              <option value="google/gemini-3.5-flash-lite">{"Gemini 3.5 Flash-Lite"}</option>
              <option value="nvidia/nemotron-3-ultra-550b-a55b:free">{"Nemotron 3 Ultra"}</option>
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
              <option value="nvidia/nemotron-3.5-super-vl:free">
                {"Nemotron 3.5 Super"}
              </option>
              {"\n                            "}
              <option value="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free">
                {"Nemotron 3 Nano Omni"}
              </option>
              {"\n                            "}
              <option value="google/gemma-4-31b-it:free">{"Gemma 4"}</option>
              {"\n                            "}
              <option value="openai/gpt-5.1">{"ChatGPT-5.1 (150 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-5-mini">{"GPT-5 Mini (70 cr)"}</option>
              {"\n                            "}
              <option value="openai/gpt-5-nano">
                {"GPT-5 Nano (45 cr)"}
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
                {"Claude Sonnet 4.6 (75 cr)"}
              </option>
              {"\n                            "}
              <option value="anthropic/claude-sonnet-4.5">
                {"Claude Sonnet 4.5 (70 cr)"}
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
            <button type="button" id="activeProjectBtn" className="active-project-btn" hidden disabled={!ready}></button>
            {"\n\n                    "}
            <div className="header-right">
              {workspace && isChatRoute && <ChatHeaderActions />}
              <div className="credits-display" id="credits-btn">
                {"\n                            "}
                <button
                  disabled={!ready}
                  id="creditsBtn"
                  className="creditsBtn primary"
                  aria-label="Get More Credits"
                  onClick={(event) => dispatch("chat-15", event)}
                >
                  {"\n                                "}
                  <span className="credits-gem" aria-hidden="true">{workspace ? <WorkspaceIcon name="gem" size={14} /> : "✦"}</span>
                  {" \n                                "}
                  <span id="creditBalance">{"0"}</span>
                  <span className="credits-unit">credits</span>
                  <span className="credits-cta hide-on-mobile credits-text">
                    {"Add credits"}
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
                  <i className={workspace ? "workspace-account-icon" : "fas fa-user"} id="navIcon" aria-hidden="true">{workspace && <WorkspaceIcon name="user" size={18}/>}</i>
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
                        src="/images/logo.svg"
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
                      href="/#products"
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
        <div id="chatContainer" aria-hidden={!isChatRoute ? true : undefined}>
          {"\n                "}
          <div className="welcome-container" id="welcomeScreen">
            <div className="logo-wrapper">
              <div className="glow-effect"></div>
              <div className="logo-inner">
                <img className="welcome-logo-genyxo" src="/images/logo.svg" width="46" height="46" fetchPriority="high" alt="Logo" />
              </div>
            </div>
            {workspace && <div className="gx-welcome-orb"><GenyxoOrb size={112} /></div>}
            <h1 className="welcome-text">{workspace ? <WelcomeGreeting /> : "What can we create together?"}</h1>
            <p className="welcome-subtext">{workspace ? "Every leading model, one credit balance. Ask anything or pick a starting point." : "Ask anything, or choose a way to begin."}</p>
            {!workspace && <div className="features-grid">
              <button type="button" className="feature-card" onClick={(event) => dispatch("chat-16", event)} disabled={!ready}>
                <i className="fas fa-image cyan-icon"></i>
                <span>{"Create an image"}</span>
              </button>
              <button type="button" className="feature-card" onClick={(event) => dispatch("chat-17", event)} disabled={!ready}>
                <i className="fas fa-code cyan-icon"></i>
                <span>{"Help me code"}</span>
              </button>
              <button type="button" className="feature-card" onClick={(event) => dispatch("chat-18", event)} disabled={!ready}>
                <i className="fas fa-video cyan-icon"></i>
                <span>{"Make a video"}</span>
              </button>
            </div>}
          </div>
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
          {workspace && <VoiceStage />}
          <div className="chat-input-container">
            {workspace && <button type="button" id="scrollBottomBtn" className="gx-scroll-bottom" aria-label="Scroll to latest message" tabIndex={-1}><WorkspaceIcon name="arrow-down" size={18} /></button>}
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
                  {workspace ? <>
                    <input disabled={!ready} type="file" accept="image/*" multiple hidden id="photoInput" />
                    <input disabled={!ready} type="file" multiple hidden id="fileInput" />
                    <ComposerPlusMenu disabled={!ready} />
                  </> : <>
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
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    {"\n                                "}
                  </button>
                  {
                    "\n                                \n                                "
                  }
                  </>}
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
                      <span className="composer-scrollbar" aria-hidden="true"><span className="composer-scrollbar-thumb" /></span>
                      {"\n                                    "}
                    </div>
                    {"\n                                "}
                  </div>
                  {"\n\n                                "}
                  <span id="dictationStatus" className="dictation-status" role="status" aria-live="polite"></span>
                  <button disabled={!ready} type="button" className="voice-btn" id="voiceBtn" aria-label="Dictate a message" title="Dictate a message">
                    {workspace ? <WorkspaceIcon name="mic" /> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1M12 18v3.5m-4 0h8"/></svg>}
                  </button>
                  {workspace && <VoiceControls />}
                  {workspace && <button type="button" className="gx-stop-btn" id="stopBtn" aria-label="Stop generating (Esc)" title="Stop generating (Esc)"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="3.2" fill="currentColor" /></svg></button>}
                  <button
                    disabled={!ready}
                    type="submit"
                    className="send-btn"
                    id="sendBtn"
                  >
                    {"\n                                    "}
                    {workspace ? <WorkspaceIcon name="arrow-up" /> : <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>}
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
        {!isChatRoute && <section className="workspace-route-content">{children}</section>}
      </main>
      {"\n    "}
    </div>
  );
}
