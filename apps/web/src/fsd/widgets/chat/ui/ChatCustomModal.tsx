"use client";
import type { SyntheticEvent } from "react";

export function ChatCustomModal({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div id="customModal" className="modal-overlay" style={{ display: "none" }}>
      {"\n        "}
      <div className="modal-content">
        {"\n            "}
        <h3 id="modalTitle" style={{ marginTop: "0", color: "#fff" }}>
          {"Confirm:"}
        </h3>
        {"\n            "}
        <input
          disabled={!ready}
          type="text"
          id="modalInput"
          style={{ display: "none" }}
        />
        {"\n            "}
        <div
          className="modal-buttons"
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
          }}
        >
          {"\n                "}
          <button
            disabled={!ready}
            id="modalCancel"
            className="sidebar-btn"
            style={{
              background: "#333",
              border: "none",
              color: "white",
              padding: "8px 15px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {"Cancel"}
          </button>
          {"\n                "}
          <button
            disabled={!ready}
            id="modalConfirm"
            className="sidebar-btn"
            style={{
              background: "#007bff",
              border: "none",
              color: "white",
              padding: "8px 15px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            {"Ok"}
          </button>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
