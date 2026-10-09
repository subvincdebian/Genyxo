"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function SupportFaqWindow({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div id="faqWindow">
      {"\n        "}
      <div className="faq-header">
        {"\n            "}
        <button
          disabled={!ready}
          id="faqBackBtn"
          className="faq-icon-btn"
          style={{ visibility: "hidden" }}
        >
          {"\n                "}
          <i className="fas fa-arrow-left"></i>{" "}
        </button>
        {"\n            "}
        <Localized
          as="span"
          translationKey="faq.title"
          className="faq-title"
          data-i18n="faq.title"
        >
          {"Help & FAQ"}
        </Localized>
        {"\n            "}
        <button disabled={!ready} id="faqCloseBtn" className="faq-icon-btn">
          {"\n                "}
          <i className="fas fa-times"></i>{" "}
        </button>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="faq-body">
        {"\n            \n            "}
        <div id="faqMenu" className="faq-menu">
          {"\n                "}
          <div
            className="faq-menu-item"
            onClick={(event) => dispatch("support-0", event)}
          >
            {"\n                    "}
            <Localized
              as="span"
              translationKey="faq.general"
              className="faq-item-title"
              data-i18n="faq.general"
            >
              {"General Questions"}
            </Localized>
            {"\n                    "}
            <span className="faq-arrow">{"❯"}</span>
            {"\n                "}
          </div>
          {"\n                "}
          <div
            className="faq-menu-item"
            onClick={(event) => dispatch("support-1", event)}
          >
            {"\n                    "}
            <Localized
              as="span"
              translationKey="faq.subscription"
              className="faq-item-title"
              data-i18n="faq.subscription"
            >
              {"Credits and Payment"}
            </Localized>
            {"\n                    "}
            <span className="faq-arrow">{"❯"}</span>
            {"\n                "}
          </div>
          {"\n                "}
          <div
            className="faq-menu-item"
            onClick={(event) => dispatch("support-2", event)}
          >
            {"\n                    "}
            <Localized
              as="span"
              translationKey="faq.models"
              className="faq-item-title"
              data-i18n="faq.models"
            >
              {"Models (GPT, Gemini)"}
            </Localized>
            {"\n                    "}
            <span className="faq-arrow">{"❯"}</span>
            {"\n                "}
          </div>
          {"\n                "}
          <div
            className="faq-menu-item"
            onClick={(event) => dispatch("support-3", event)}
          >
            {"\n                    "}
            <Localized
              as="span"
              translationKey="faq.tech"
              className="faq-item-title"
              data-i18n="faq.tech"
            >
              {"Technical problems"}
            </Localized>
            {"\n                    "}
            <span className="faq-arrow">{"❯"}</span>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div id="page-general" className="faq-content-page">
          {"\n                "}
          <Localized
            as="h4"
            translationKey="faq.general_title"
            data-i18n="faq.general_title"
          >
            {"What is Genyxo AI?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.general_text"
            data-i18n="faq.general_text"
          >
            {
              "Genyxo AI is a platform that combines the best neural networks in a single interface..."
            }
          </Localized>
          {"\n                \n                "}
          <Localized
            as="h4"
            translationKey="faq.safe_title"
            data-i18n="faq.safe_title"
          >
            {"Is my data safe?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.safe_text"
            data-i18n="faq.safe_text"
          >
            {
              "We transmit your prompts to neural networks via secure corporate API channels. According to our agreements, your data is not used to train global models. However, we still recommend that you do not enter your passwords or bank card information in the chat."
            }
          </Localized>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div id="page-subscription" className="faq-content-page">
          {"\n                "}
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"How do Credits work?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              "You purchase a package of credits that are spent on each message. The amount spent depends on two factors: the chosen model and the length of the conversation.."
            }
          </Localized>
          {"\n                "}
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"How much does one message cost?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {"Different models cost differently:"}
            <br />
            {"\n                • "}
            <b>{"GPT-4o / Claude 3 Opus:"}</b>
            {" High cost (smart models)."}
            <br />
            {"\n                • "}
            <b>{"GPT-3.5 / Gemini Flash:"}</b>
            {" Low cost (fast models)."}
            <br />
            {
              "\n                The exact price is displayed next to the model selection."
            }
          </Localized>
          {"\n\n                "}
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"Do credits burn out?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              "No! Purchased credit packages remain on your balance forever until you spend them. You can return to them even after a year."
            }
          </Localized>
          {"\n\n                "}
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"What to do if you run out of credit?"}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              'The chat will be paused. You need to click the "Top Up" button in the menu to purchase a new package.'
            }
          </Localized>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div id="page-models" className="faq-content-page">
          {"\n                "}
          <Localized
            as="h4"
            translationKey="faq.models_diff"
            data-i18n="faq.models_diff"
          >
            {"What is the difference between the models?"}
          </Localized>
          {"\n                "}
          <p>
            {
              "GPT-4 is better suited for logic and code. Gemini works great with large texts. Sora generates video."
            }
          </p>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div id="page-errors" className="faq-content-page">
          {"\n                "}
          <h4>{"Why is the chat not responding?"}</h4>
          {"\n                "}
          <p>
            {
              'Check your internet connection or refresh the page. If the issue persists, click the "Report a Bug" button below.'
            }
          </p>
          {"\n            "}
        </div>
        {"\n\n        "}
      </div>
      {"\n\n        "}
      <div className="faq-footer">
        {"\n            "}
        <a href="/support.html" className="faq-report-btn">
          {"\n                "}
          <i className="fas fa-bug" style={{ marginRight: "8px" }}></i>
          {" Report a Bug\n            "}
        </a>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
