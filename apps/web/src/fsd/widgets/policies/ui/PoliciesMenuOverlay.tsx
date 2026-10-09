"use client";
import type { SyntheticEvent } from "react";

export function PoliciesMenuOverlay({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return <div className="menu-overlay" id="menuOverlay"></div>;
}
