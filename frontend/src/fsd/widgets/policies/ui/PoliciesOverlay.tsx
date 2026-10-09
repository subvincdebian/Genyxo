"use client";
import type { SyntheticEvent } from "react";

export function PoliciesOverlay({
  dispatch,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div
      className="sidebar-overlay"
      id="overlay"
      onClick={(event) => dispatch("policies-0", event)}
    ></div>
  );
}
