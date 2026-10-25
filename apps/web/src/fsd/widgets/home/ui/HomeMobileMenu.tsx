"use client";
import type { SyntheticEvent } from "react";
import { useLanguage } from "@/shared/i18n";

export function HomeMobileMenu({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label={t("nav.navigation", "Main navigation")}>
      <button className="gx-menu-close" id="closeMobileMenu" type="button" aria-label={t("nav.close_menu", "Close menu")}>×</button>
      {"\n        "}
      <ul>
        {"\n            "}
        <li>
          <a href="#home" aria-label="Home Page">
            {t("nav.home")}
          </a>
        </li>
        {"\n            "}
        <li>
          <a href="#products" aria-label="Product Section">
            {t("nav.products")}
          </a>
        </li>
        {"\n            "}
        <li>
          <a href="/chat" aria-label="Chat Page">
            {t("nav.chat")}
          </a>
        </li>
        {"\n            "}
        <li>
          <a href="#about" aria-label="About Us">
            {t("nav.about")}
          </a>
        </li>
        {"\n        "}
      </ul>
      {"\n    "}
    </div>
  );
}
