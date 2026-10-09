"use client";
import type { SyntheticEvent } from "react";

export function PoliciesLegalNavWrapper({
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
        <button
          disabled={!ready}
          className="tab-link active"
          onClick={(event) => dispatch("policies-2", event)}
        >
          {"Review"}
        </button>
        {"\n            "}
        <a href="/policies/privacy-policy.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("policies-3", event)}
          >
            {"Privacy Policy"}
          </button>
        </a>
        {"\n            "}
        <a href="/policies/terms-of-service.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("policies-4", event)}
          >
            {"Terms of Service"}
          </button>
        </a>
        {"\n            "}
        <a href="/policies/faq.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("policies-5", event)}
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
