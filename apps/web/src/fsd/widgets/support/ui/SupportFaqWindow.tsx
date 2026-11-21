"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
import styles from "./SupportFaqWindow.module.css";

// features/support/model/support-inline1.js drives this panel: it toggles
// #faqWindow.active, #faqMenu, #faqBackBtn and .faq-content-page.active, and
// scrolls .faq-body. Those ids and hook classes must stay.
export function SupportFaqWindow({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const topics = [
    { action: "support-0", key: "faq.general", label: "General Questions" },
    { action: "support-1", key: "faq.subscription", label: "Credits and Payment" },
    { action: "support-2", key: "faq.models", label: "Models (GPT, Gemini)" },
    { action: "support-3", key: "faq.tech", label: "Technical problems" },
  ];
  return (
    <aside
      id="faqWindow"
      className={styles.window}
      aria-labelledby="faqWindowTitle"
    >
      <div className={styles.header}>
        <button
          type="button"
          disabled={!ready}
          id="faqBackBtn"
          className={styles.iconButton}
          style={{ visibility: "hidden" }}
          aria-label="Back"
        >
          <i className="fas fa-arrow-left" aria-hidden="true"></i>
        </button>
        <Localized
          as="span"
          translationKey="faq.title"
          className={`${styles.title} faq-title`}
          id="faqWindowTitle"
          data-i18n="faq.title"
        >
          {"Help & FAQ"}
        </Localized>
        <button
          type="button"
          disabled={!ready}
          id="faqCloseBtn"
          className={styles.iconButton}
          aria-label="Close"
        >
          <i className="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>

      <div className={`${styles.body} faq-body`}>
        <div id="faqMenu" className={styles.menu}>
          {topics.map((topic) => (
            <button
              key={topic.action}
              type="button"
              className={styles.topic}
              onClick={(event) => dispatch(topic.action, event)}
            >
              <Localized
                as="span"
                translationKey={topic.key}
                data-i18n={topic.key}
              >
                {topic.label}
              </Localized>
              <i className="fas fa-chevron-right" aria-hidden="true"></i>
            </button>
          ))}
        </div>

        <div id="page-general" className={`${styles.page} faq-content-page`}>
          <Localized
            as="h4"
            translationKey="faq.general_title"
            data-i18n="faq.general_title"
          >
            {"What is Genyxo AI?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.general_text"
            data-i18n="faq.general_text"
          >
            {
              "Genyxo AI is a platform that combines the best neural networks in a single interface..."
            }
          </Localized>
          <Localized
            as="h4"
            translationKey="faq.safe_title"
            data-i18n="faq.safe_title"
          >
            {"Is my data safe?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.safe_text"
            data-i18n="faq.safe_text"
          >
            {
              "We transmit your prompts to neural networks via secure corporate API channels. According to our agreements, your data is not used to train global models. However, we still recommend that you do not enter your passwords or bank card information in the chat."
            }
          </Localized>
        </div>

        <div
          id="page-subscription"
          className={`${styles.page} faq-content-page`}
        >
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"How do Credits work?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              "You purchase a package of credits that are spent on each message. The amount spent depends on two factors: the chosen model and the length of the conversation.."
            }
          </Localized>
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"How much does one message cost?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {"Different models cost differently:"}
            <br />
            {"• "}
            <b>{"GPT-4o / Claude 3 Opus:"}</b>
            {" High cost (smart models)."}
            <br />
            {"• "}
            <b>{"GPT-3.5 / Gemini Flash:"}</b>
            {" Low cost (fast models)."}
            <br />
            {"The exact price is displayed next to the model selection."}
          </Localized>
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"Do credits burn out?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              "No! Purchased credit packages remain on your balance forever until you spend them. You can return to them even after a year."
            }
          </Localized>
          <Localized
            as="h4"
            translationKey="faq.tokens_title"
            data-i18n="faq.tokens_title"
          >
            {"What to do if you run out of credit?"}
          </Localized>
          <Localized
            as="p"
            translationKey="faq.tokens_text"
            data-i18n="faq.tokens_text"
          >
            {
              'The chat will be paused. You need to click the "Top Up" button in the menu to purchase a new package.'
            }
          </Localized>
        </div>

        <div id="page-models" className={`${styles.page} faq-content-page`}>
          <Localized
            as="h4"
            translationKey="faq.models_diff"
            data-i18n="faq.models_diff"
          >
            {"What is the difference between the models?"}
          </Localized>
          <p>
            {
              "GPT-4 is better suited for logic and code. Gemini works great with large texts. Sora generates video."
            }
          </p>
        </div>

        <div id="page-errors" className={`${styles.page} faq-content-page`}>
          <h4>{"Why is the chat not responding?"}</h4>
          <p>
            {
              'Check your internet connection or refresh the page. If the issue persists, click the "Report a Bug" button below.'
            }
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <a href="#createTicketForm" className={styles.report}>
          <i className="fas fa-bug" aria-hidden="true"></i>
          {"Report a Bug"}
        </a>
      </div>
    </aside>
  );
}
