"use client";
import type { SyntheticEvent } from "react";
import { AvatarNavbar } from "@/entities/session";

import { Localized, useLanguage } from "@/shared/i18n";
export function HomeNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const { t } = useLanguage();
  return (
    <nav className="navbar" aria-label={t("nav.navigation", "Main navigation")}>
      {"\n        "}
      <div className="nav-container">
        {"\n            "}
        <button className="burger" id="burger" type="button" aria-label={t("nav.open_menu", "Open navigation menu")} aria-controls="mobileMenu" aria-expanded="false">
          {"\n                "}
          <span></span>
          {"\n                "}
          <span></span>
          {"\n                "}
          <span></span>
          {"\n            "}
        </button>
        {"\n\n            "}
        <div className="left-side">
          {"\n                "}
          <a className="nav-logo" href="#home" aria-label="Genyxo home">
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
          {"\n                    \n                "}
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="right-side">
          {"\n                "}
          <div className="nav-links">
            <img className="gx-nav-brain" src="/images/logo.svg" width="34" height="34" alt="" aria-hidden="true" />
            <span className="gx-nav-bubble" aria-hidden="true" />
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
              {"Credits"}
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
          <AvatarNavbar ready={ready} />
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
