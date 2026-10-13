"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
import { LanguageGrid } from "@/features/language";
export function ProfileLangModal({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="modal" id="langModal">
      {"\n        "}
      <div className="modal-content glass" style={{ maxWidth: "400px" }}>
        {"\n            "}
        <span className="close-btn" id="closeLangModal">
          {"×"}
        </span>
        {"\n            "}
        <Localized
          as="h2"
          translationKey="language.select"
          style={{ textAlign: "center", marginBottom: "20px" }}
          data-i18n="language.select"
        >
          {"Select Language"}
        </Localized>
        {"\n            "}
        <div className="lang-grid" id="langGrid">
          <LanguageGrid />
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
