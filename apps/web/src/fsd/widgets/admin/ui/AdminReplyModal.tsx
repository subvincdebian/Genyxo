"use client";
import type { SyntheticEvent } from "react";

export function AdminReplyModal({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div id="replyModal" className="modal-overlay">
      {"\n        "}
      <div className="modal-content glass">
        {"\n            "}
        <h3>
          {"Reply to Ticket #"}
          <span id="modalTicketId"></span>
        </h3>
        {"\n            "}
        <p>
          <strong>{"User Message:"}</strong>
        </p>
        {"\n            "}
        <div id="modalUserMessage" className="user-message-box"></div>
        {"\n            "}
        <label htmlFor="replyInput">{"Your Reply:"}</label>
        {"\n            "}
        <textarea
          disabled={!ready}
          id="replyInput"
          rows={5}
          placeholder="Enter your response here..."
          defaultValue=""
        />
        {"\n            "}
        <div className="modal-actions">
          {"\n                "}
          <button
            disabled={!ready}
            className="action-btn"
            aria-label="Cancel"
            onClick={(event) => dispatch("admin-6", event)}
          >
            {"Cancel"}
          </button>
          {"\n                "}
          <button
            disabled={!ready}
            className="action-btn primary-btn"
            aria-label="Send Reply"
            onClick={(event) => dispatch("admin-7", event)}
          >
            {"Send Reply"}
          </button>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
