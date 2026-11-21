"use client";
import type { SyntheticEvent } from "react";
import { AvatarNavbar } from "@/entities/session";

import { Localized } from "@/shared/i18n";
export function AdminNavbar({
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
            href="/"
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
          {"\n\n                "}
          <AvatarNavbar ready={ready} />
          {"\n                "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
