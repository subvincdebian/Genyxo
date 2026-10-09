"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function ProfileMobileMenu({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="mobile-menu" id="mobileMenu">
      {"\n        "}
      <ul>
        {"\n            "}
        <li>
          <Localized
            as="a"
            translationKey="nav.home"
            href="/index.html"
            data-i18n="nav.home"
            aria-label="Home Page"
          >
            {"Home"}
          </Localized>
        </li>
        {"\n            "}
        <li>
          <Localized
            as="a"
            translationKey="nav.chat"
            href="/chat.html"
            data-i18n="nav.chat"
            aria-label="Chat Page"
          >
            {"Chat"}
          </Localized>
        </li>
        {"\n            "}
        <li>
          <Localized
            as="a"
            translationKey="nav.about"
            href="/support.html"
            data-i18n="nav.about"
            aria-label="Support Page"
          >
            {"Support"}
          </Localized>
        </li>
        {"\n        "}
      </ul>
      {"\n    "}
    </div>
  );
}
