"use client";
import type { SyntheticEvent } from "react";
import { AvatarNavbar } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function PoliciesNavbar({
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
        <div
          className="burger"
          id="toggleMobileMenu"
          onClick={(event) => dispatch("policies-1", event)}
        >
          {"\n                "}
          <i className="fas fa-bars"></i>
          {"\n                "}
          <aside className="privacy-sidebar" id="mobileSidebar">
            {"\n                    "}
            <div className="sidebar-header-simple">
              {"\n                        "}
              <div className="brand-icon">
                {"\n                            "}
                <img
                  src="/images/logo.svg"
                  width="40"
                  height="40"
                  fetchPriority="high"
                  className="logo-icon"
                  alt="Logo"
                />
                {"\n                        "}
              </div>
              {"\n                        "}
              <span className="brand-name">{"Genyxo - Terms of Service"}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <nav className="sidebar-nav-clean">
              {"\n                        "}
              <a href="/policies/policies.html" className="nav-btn active">
                {"\n                            "}
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="#D3D3D3"
                  style={{ flexShrink: "0" }}
                >
                  {"\n                                "}
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path>
                  {"\n                            "}
                </svg>
                {" Review\n                        "}
              </a>
              {"\n                        "}
              <div className="nav-sep"></div>
              {"\n\n                        "}
              <a href="/policies/privacy-policy.html" className="nav-btn">
                {"\n                            "}
                <i className="fas fa-shield-alt"></i>
                {" Privacy Policy\n                        "}
              </a>
              {"\n\n                        "}
              <div className="nav-sep"></div>
              {"\n\n                        "}
              <a href="/policies/terms-of-service.html" className="nav-btn">
                {"\n                            "}
                <i className="fas fa-file-contract"></i>
                {" Terms of Service\n                        "}
              </a>
              {"\n\n                        "}
              <div className="nav-sep"></div>
              {"\n\n                        "}
              <a href="/policies/faq.html" className="nav-btn">
                {"\n                            "}
                <i className="fas fa-question-circle"></i>
                {" FAQ\n                        "}
              </a>
              {"\n                    "}
            </nav>
            {"\n                "}
          </aside>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="left-side">
          {"\n                "}
          <div className="nav-logo">
            {"\n                    "}
            <a
              href="/"
              aria-label="Home Page"
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              {"\n                        "}
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
              {"\n                    "}
            </a>
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
              href="/"
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
              href="/chat"
              className="nav-link"
              data-i18n="nav.chat"
              aria-label="Chat Page"
            >
              {"Chat"}
            </Localized>
            {"\n                "}
          </div>
          {"\n                "}
          <AvatarNavbar ready={ready} />
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
