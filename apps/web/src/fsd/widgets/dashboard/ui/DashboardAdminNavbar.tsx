"use client";
import { AvatarNavbar } from "@/entities/session";
import type { SyntheticEvent } from "react";

export function DashboardAdminNavbar({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <nav className="admin-navbar animate-item">
      {"\n        "}
      <div className="nav-left">
        {"\n            "}
        <button
          disabled={!ready}
          className="sidebar-toggle-btn"
          id="sidebarToggle"
          aria-label="Open Menu"
        >
          {"\n                "}
          <i className="fas fa-bars"></i>
          {"\n            "}
        </button>
        {"\n            "}
        <a
          href="/"
          style={{ textDecoration: "none", color: "#fff", display: "flex" }}
        >
          {"\n            "}
          <div className="nav-logo">
            {"\n                "}
            <img src="/images/logo.svg" width="30" height="30" alt="Logo" />
            {"\n                "}
            <span>
              {"Genyxo "}
              <span style={{ color: "#10e6cc" }}>{"Admin"}</span>
            </span>
            {"\n            "}
          </div>
          {"\n            "}
        </a>
        {"\n        "}
      </div>
      {"\n        \n        "}
      <div className="nav-right">
        {"\n            "}
        <AvatarNavbar ready={ready} />
        {"\n        "}
      </div>
      {"\n    "}
    </nav>
  );
}
