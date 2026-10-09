"use client";
import type { SyntheticEvent } from "react";

export function ChatSearchChatsModal({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div id="searchChatsModal" className="search-modal-overlay">
      {"\n        "}
      <div className="search-modal-window">
        {"\n            "}
        <div className="search-modal-header">
          {"\n                "}
          <span className="search-modal-title">{"Search history"}</span>
          {"\n                "}
          <button
            disabled={!ready}
            className="search-close-btn"
            id="closeSearchModal"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="search-input-container">
          {"\n                "}
          <i className="fa-solid fa-magnifying-glass"></i>
          {"\n                "}
          <input
            disabled={!ready}
            type="text"
            id="modalSearchInput"
            placeholder="Find previous chats..."
            autoComplete="off"
          />
          {"\n            "}
        </div>
        {"\n\n            "}
        <ul className="search-results-list" id="modalSearchResults">
          {"\n                "}
        </ul>
        {"\n            "}
        <div id="searchNoResults" className="search-no-results">
          {"No chats found matching your search."}
        </div>
        {"\n\n            "}
        <div className="search-modal-footer">
          {"\n                "}
          <button
            disabled={!ready}
            className="modal-new-chat-btn"
            id="modalNewChatBtn"
          >
            {"\n                    "}
            <i className="fa-solid fa-plus"></i>
            {" Start New Chat\n                "}
          </button>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
