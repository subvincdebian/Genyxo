"use client";
import type { SyntheticEvent } from "react";

export function TermsOfServiceOverlay({
  dispatch,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div
      className="sidebar-overlay"
      id="overlay"
      onClick={(event) => dispatch("terms-of-service-0", event)}
    ></div>
  );
}
