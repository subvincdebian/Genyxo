"use client";
import type { SyntheticEvent } from "react";

export function FaqLegalNavWrapper({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="legal-nav-wrapper">
      {"\n        "}
      <div className="legal-tabs-container">
        {"\n            "}
        <a href="/policies/policies.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("faq-7", event)}
          >
            {"Review"}
          </button>
        </a>
        {"\n            "}
        <a href="/policies/privacy-policy.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("faq-8", event)}
          >
            {"Privacy Policy"}
          </button>
        </a>
        {"\n            "}
        <a href="/policies/terms-of-service.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("faq-9", event)}
          >
            {"Terms of Service"}
          </button>
        </a>
        {"\n            "}
        <button
          disabled={!ready}
          className="tab-link active"
          onClick={(event) => dispatch("faq-10", event)}
        >
          {"Frequently Asked Questions"}
        </button>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
