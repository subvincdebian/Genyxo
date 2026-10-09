"use client";
import type { SyntheticEvent } from "react";

export function ProfileToastContainer({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return <div id="toast-container"></div>;
}
