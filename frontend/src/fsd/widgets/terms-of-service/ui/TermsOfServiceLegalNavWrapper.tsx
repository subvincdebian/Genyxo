"use client";
import type { SyntheticEvent } from "react";

export function TermsOfServiceLegalNavWrapper({
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
            onClick={(event) => dispatch("terms-of-service-11", event)}
          >
            {"Review"}
          </button>
        </a>
        {"\n            "}
        <a href="/policies/privacy-policy.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("terms-of-service-12", event)}
          >
            {"Privacy Policy"}
          </button>
        </a>
        {"\n            "}
        <button
          disabled={!ready}
          className="tab-link active"
          onClick={(event) => dispatch("terms-of-service-13", event)}
        >
          {"Terms of Service"}
        </button>
        {"\n            "}
        <a href="/policies/faq.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("terms-of-service-14", event)}
          >
            {"Frequently Asked Questions"}
          </button>
        </a>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
