"use client";
import type { SyntheticEvent } from "react";

export function PrivacyPolicyLegalNavWrapper({
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
            onClick={(event) => dispatch("privacy-policy-11", event)}
          >
            {"Review"}
          </button>
        </a>
        {"\n            "}
        <button
          disabled={!ready}
          className="tab-link active"
          onClick={(event) => dispatch("privacy-policy-12", event)}
        >
          {"Privacy Policy"}
        </button>
        {"\n            "}
        <a href="/policies/terms-of-service.html">
          <button
            disabled={!ready}
            className="tab-link"
            onClick={(event) => dispatch("privacy-policy-13", event)}
          >
            {"Terms of Service"}
          </button>
        </a>
        {"\n            "}
        <button
          disabled={!ready}
          className="tab-link"
          onClick={(event) => dispatch("privacy-policy-14", event)}
        >
          {"Frequently Asked Questions"}
        </button>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
