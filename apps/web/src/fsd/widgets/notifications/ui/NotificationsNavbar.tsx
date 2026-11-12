"use client";
import type { SyntheticEvent } from "react";
import { AvatarNavbar } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function NotificationsNavbar({
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
              href="/"
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
        {"\n\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
