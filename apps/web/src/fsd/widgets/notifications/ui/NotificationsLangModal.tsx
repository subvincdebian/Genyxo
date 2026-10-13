"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
import { LanguageGrid } from "@/features/language";
export function NotificationsLangModal({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div
      className="modal"
      id="langModal"
      style={{
        display: "none",
        position: "fixed",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "10001",
      }}
    >
      {"\n        "}
      <div
        className="modal-content glass"
        style={{
          maxWidth: "400px",
          background: "#121212",
          padding: "20px",
          borderRadius: "15px",
          width: "90%",
        }}
      >
        {"\n            "}
        <span
          className="close-btn"
          id="closeLangModal"
          style={{
            float: "right",
            cursor: "pointer",
            fontSize: "1.5rem",
            color: "#aaa",
          }}
        >
          {"×"}
        </span>
        {"\n            "}
        <Localized
          as="h2"
          translationKey="language.select"
          style={{ textAlign: "center", marginBottom: "20px", color: "white" }}
          data-i18n="language.select"
        >
          {"Select Language"}
        </Localized>
        {"\n            "}
        <div
          className="lang-grid"
          id="langGrid"
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          <LanguageGrid />
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
