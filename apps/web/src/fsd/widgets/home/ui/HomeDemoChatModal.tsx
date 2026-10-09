"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function HomeDemoChatModal({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div id="demoChatModal" className="demo-modal-overlay">
      {"\n        "}
      <div className="demo-modal-content">
        {"\n            "}
        <div className="demo-modal-header">
          {"\n                "}
          <div className="demo-header-info">
            {"\n                    "}
            <div className="demo-ai-avatar">
              {"\n                        "}
              <i className="fas fa-bolt"></i>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="demo-header-text">
              {"\n                        "}
              <Localized
                as="h3"
                translationKey="demo.title"
                data-i18n="demo.title"
              >
                {"Genyxo Flash (Free)"}
              </Localized>
              {"\n                        "}
              <span className="demo-status">{"Online"}</span>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <button
            disabled={!ready}
            id="closeDemoBtn"
            className="demo-close-btn"
          >
            {"\n                    "}
            <i className="fas fa-times"></i>
            {"\n                "}
          </button>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div id="demoChatHistory" className="demo-chat-history">
          {"\n                "}
          <div className="demo-message ai-message">
            {"\n                    "}
            <p>
              {
                "Hello! I am a free Genyxo demo model. Send me a message to test how fast and smart I am before you get your credits! 🚀"
              }
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="demo-chat-input-area">
          {"\n                "}
          <input
            disabled={!ready}
            type="text"
            id="demoChatInput"
            placeholder="Type your message..."
            autoComplete="off"
          />
          {"\n                "}
          <button disabled={!ready} id="demoSendBtn" className="demo-send-btn">
            {"\n                    "}
            <i className="fas fa-paper-plane"></i>
            {"\n                "}
          </button>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
