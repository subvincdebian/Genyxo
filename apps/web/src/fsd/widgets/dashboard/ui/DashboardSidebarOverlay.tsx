"use client";
import type { SyntheticEvent } from "react";

export function DashboardSidebarOverlay({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return <div className="sidebar-overlay" id="sidebarOverlay"></div>;
}
