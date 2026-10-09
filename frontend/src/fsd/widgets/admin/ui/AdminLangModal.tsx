"use client";
import type { SyntheticEvent } from "react";

import { LanguageGrid } from "@/features/language";
export function AdminLangModal({}: {
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
        <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
          {"Select Language"}
        </h2>
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
