"use client";
import type { SyntheticEvent } from "react";

export function DashboardAdminLayout({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="admin-layout">
      {"\n        "}
      <aside className="admin-sidebar">
        {"\n\n            "}
        <button
          disabled={!ready}
          className="sidebar-close-btn"
          id="sidebarClose"
          aria-label="Close Menu"
        >
          {"\n                "}
          <i className="fas fa-times"></i>
          {"\n            "}
        </button>
        {"\n            \n            "}
        <nav className="admin-menu">
          {"\n                "}
          <a href="#" className="admin-menu-item active" data-tab="overview">
            <i className="fas fa-chart-pie"></i>
            {" Overview"}
          </a>
          {"\n                "}
          <a href="#" className="admin-menu-item" data-tab="users">
            <i className="fas fa-users"></i>
            {" Users"}
          </a>
          {"\n                "}
          <a href="#" className="admin-menu-item" data-tab="prompts">
            <i className="fas fa-robot"></i>
            {" Prompts & AI"}
          </a>
          {"\n                "}
          <a href="#" className="admin-menu-item" data-tab="sales">
            <i className="fas fa-shopping-cart"></i>
            {" Sales"}
          </a>
          {"\n                "}
          <a href="/profile.html" className="admin-menu-item back-btn">
            <i className="fas fa-arrow-left"></i>
            {" Exit Admin"}
          </a>
          {"\n            "}
        </nav>
        {"\n        "}
      </aside>
      {"\n\n        "}
      <main className="admin-main">
        {"\n\n            "}
        {"\n            "}
        <section id="tab-overview" className="tab-content active">
          {"\n                "}
          <header className="admin-header animate-item delay-1">
            {"\n                    "}
            <div>
              {"\n                        "}
              <h1>{"Overview"}</h1>
              {"\n                        "}
              <p className="sub">
                {"Here's what's happening on Genyxo today."}
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="admin-profile">
              {"\n                        "}
              <span className="live-indicator"></span>
              {" \n                        "}
              <span id="liveOnlineCount">{"142 Users Online"}</span>
              {"\n                    "}
            </div>
            {"\n                "}
          </header>
          {"\n\n                "}
          <div className="stats-grid">
            {"\n                    "}
            <div className="stat-card glass-card animate-item delay-2">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Registered Users"}</div>
                {"\n                            "}
                <div className="stat-value">{"12,845"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +124 today"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-3">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-comment-dots"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Prompts Sent"}</div>
                {"\n                            "}
                <div className="stat-value">{"452,890"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +8,430 today"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-4">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-bolt"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Global Credits Spent"}</div>
                {"\n                            "}
                <div className="stat-value">
                  {"1,45M "}
                  <span>{"🪙"}</span>
                </div>
                {"\n                            "}
                <div className="stat-trend">
                  <i className="fas fa-minus"></i>
                  {" Normal usage"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-5">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Peak Online (All Time)"}</div>
                {"\n                            "}
                <div className="stat-value">{"843"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  {"Achieved May 12, 2026"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="charts-grid animate-item delay-6">
            {"\n                    "}
            <div className="chart-container glass-card">
              {"\n                        "}
              <div className="chart-header">
                {"\n                            "}
                <h3>{"Global Credit Usage & Revenue"}</h3>
                {"\n                            "}
                <div className="time-filters">
                  {"\n                                "}
                  <button disabled={!ready} className="filter-btn active">
                    {"1W"}
                  </button>
                  {"\n                                "}
                  <button disabled={!ready} className="filter-btn">
                    {"1M"}
                  </button>
                  {"\n                                "}
                  <button disabled={!ready} className="filter-btn">
                    {"1Y"}
                  </button>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div style={{ height: "300px", width: "100%" }}>
                {"\n                            "}
                <canvas id="adminGlobalChart"></canvas>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tables-grid animate-item delay-7">
            {"\n                    "}
            <div className="table-card glass-card">
              {"\n                        "}
              <h3>{"Live Recent Activity"}</h3>
              {"\n                        "}
              <div className="table-wrapper">
                {"\n                            "}
                <table className="genyxo-table">
                  <thead>
                    <tr>
                      <th>{"User"}</th>
                      <th>{"Action"}</th>
                      <th>{"Model / Pack"}</th>
                      <th>{"Time"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="bold-white">{"alex_dev"}</span>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            color: "#10e6cc",
                            background: "rgba(16,230,204,0.1)",
                          }}
                        >
                          {"Prompt Sent"}
                        </span>
                      </td>
                      <td>{"GPT-4o (40 cr)"}</td>
                      <td className="dim-text">{"Just now"}</td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"maria_99"}</span>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            color: "#2ecc71",
                            background: "rgba(46,204,113,0.1)",
                          }}
                        >
                          {"Purchased Pack"}
                        </span>
                      </td>
                      <td>{"Pro Creator ($24.99)"}</td>
                      <td className="dim-text">{"2 min ago"}</td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"new_user123"}</span>
                      </td>
                      <td>
                        <span
                          className="status-pill"
                          style={{
                            color: "#f1c40f",
                            background: "rgba(241,196,15,0.1)",
                          }}
                        >
                          {"Registered"}
                        </span>
                      </td>
                      <td>{"-"}</td>
                      <td className="dim-text">{"5 min ago"}</td>
                    </tr>
                  </tbody>
                </table>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        {"\n            "}
        <section id="tab-users" className="tab-content">
          {"\n                "}
          <header className="admin-header animate-item delay-1">
            {"\n                    "}
            <div>
              {"\n                        "}
              <h1>{"Users Management"}</h1>
              {"\n                        "}
              <p className="sub">
                {"Manage and monitor all registered users."}
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="admin-profile">
              {"\n                        "}
              <button
                disabled={!ready}
                className="btn-secondary"
                id="exportUsersBtn"
              >
                <i className="fas fa-download"></i>
                {" Export"}
              </button>
              {"\n                    "}
            </div>
            {"\n                "}
          </header>
          {"\n\n                "}
          <div className="stats-grid">
            {"\n                    "}
            <div className="stat-card glass-card animate-item delay-2">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Users"}</div>
                {"\n                            "}
                <div className="stat-value">{"12,845"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +324 this week"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-3">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-user-check"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Active Users"}</div>
                {"\n                            "}
                <div className="stat-value">{"8,921"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" 69% active"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-4">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-user-slash"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Banned Users"}</div>
                {"\n                            "}
                <div className="stat-value">{"24"}</div>
                {"\n                            "}
                <div className="stat-trend">
                  <i className="fas fa-minus"></i>
                  {" 0 this week"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-5">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-user-graduate"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Premium Users"}</div>
                {"\n                            "}
                <div className="stat-value">{"3,421"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +89 today"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tables-grid animate-item delay-6">
            {"\n                    "}
            <div className="table-card glass-card">
              {"\n                        "}
              <div className="table-header-top">
                {"\n                            "}
                <h3>{"Recent Users"}</h3>
                {"\n                            "}
                <div className="search-box">
                  {"\n                                "}
                  <i className="fas fa-search"></i>
                  {"\n                                "}
                  <input
                    disabled={!ready}
                    type="text"
                    placeholder="Search users..."
                  />
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="table-wrapper">
                {"\n                            "}
                <table className="genyxo-table">
                  <thead>
                    <tr>
                      <th>{"Username"}</th>
                      <th>{"Email"}</th>
                      <th>{"Status"}</th>
                      <th>{"Joined"}</th>
                      <th>{"Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="bold-white">{"alex_dev"}</span>
                      </td>
                      <td>{"alex@example.com"}</td>
                      <td>
                        <span className="status-badge active">{"Active"}</span>
                      </td>
                      <td className="dim-text">{"Jan 15, 2026"}</td>
                      <td>
                        <button
                          disabled={!ready}
                          className="action-btn"
                          title="View"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"maria_99"}</span>
                      </td>
                      <td>{"maria@example.com"}</td>
                      <td>
                        <span className="status-badge active">{"Active"}</span>
                      </td>
                      <td className="dim-text">{"Feb 3, 2026"}</td>
                      <td>
                        <button
                          disabled={!ready}
                          className="action-btn"
                          title="View"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"john_pro"}</span>
                      </td>
                      <td>{"john@example.com"}</td>
                      <td>
                        <span className="status-badge inactive">
                          {"Inactive"}
                        </span>
                      </td>
                      <td className="dim-text">{"Dec 22, 2025"}</td>
                      <td>
                        <button
                          disabled={!ready}
                          className="action-btn"
                          title="View"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        {"\n            "}
        <section id="tab-prompts" className="tab-content">
          {"\n                "}
          <header className="admin-header animate-item delay-1">
            {"\n                    "}
            <div>
              {"\n                        "}
              <h1>{"Prompts & AI Management"}</h1>
              {"\n                        "}
              <p className="sub">
                {"Monitor and manage AI model usage and prompts."}
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="admin-profile">
              {"\n                        "}
              <button
                disabled={!ready}
                className="btn-secondary"
                id="addPromptBtn"
              >
                <i className="fas fa-plus"></i>
                {" New Prompt"}
              </button>
              {"\n                    "}
            </div>
            {"\n                "}
          </header>
          {"\n\n                "}
          <div className="stats-grid">
            {"\n                    "}
            <div className="stat-card glass-card animate-item delay-2">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-robot"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Active AI Models"}</div>
                {"\n                            "}
                <div className="stat-value">{"12"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-check-circle"></i>
                  {" All online"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-3">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-comments"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Prompts Today"}</div>
                {"\n                            "}
                <div className="stat-value">{"45,230"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +15% vs yesterday"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-4">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-percentage"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Success Rate"}</div>
                {"\n                            "}
                <div className="stat-value">{"99.8%"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" Excellent"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-5">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-hourglass-end"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Avg Response Time"}</div>
                {"\n                            "}
                <div className="stat-value">{"1.2s"}</div>
                {"\n                            "}
                <div className="stat-trend">
                  <i className="fas fa-minus"></i>
                  {" Normal"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tables-grid animate-item delay-6">
            {"\n                    "}
            <div className="table-card glass-card">
              {"\n                        "}
              <h3>{"AI Models Status"}</h3>
              {"\n                        "}
              <div className="table-wrapper">
                {"\n                            "}
                <table className="genyxo-table">
                  <thead>
                    <tr>
                      <th>{"Model"}</th>
                      <th>{"Provider"}</th>
                      <th>{"Status"}</th>
                      <th>{"Usage Today"}</th>
                      <th>{"Performance"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="bold-white">{"GPT-4o"}</span>
                      </td>
                      <td>{"OpenAI"}</td>
                      <td>
                        <span className="status-badge active">{"Online"}</span>
                      </td>
                      <td>{"15,420"}</td>
                      <td>
                        <span className="status-badge success">
                          {"✓ Excellent"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"Gemini Pro"}</span>
                      </td>
                      <td>{"Google"}</td>
                      <td>
                        <span className="status-badge active">{"Online"}</span>
                      </td>
                      <td>{"12,890"}</td>
                      <td>
                        <span className="status-badge success">
                          {"✓ Excellent"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"Claude 3"}</span>
                      </td>
                      <td>{"Anthropic"}</td>
                      <td>
                        <span className="status-badge active">{"Online"}</span>
                      </td>
                      <td>{"8,920"}</td>
                      <td>
                        <span className="status-badge warning">{"⚠ Good"}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        {"\n            "}
        <section id="tab-sales" className="tab-content">
          {"\n                "}
          <header className="admin-header animate-item delay-1">
            {"\n                    "}
            <div>
              {"\n                        "}
              <h1>{"Sales & Revenue"}</h1>
              {"\n                        "}
              <p className="sub">
                {"Track all transactions and revenue metrics."}
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="admin-profile">
              {"\n                        "}
              <button
                disabled={!ready}
                className="btn-secondary"
                id="reportSalesBtn"
              >
                <i className="fas fa-file-pdf"></i>
                {" Report"}
              </button>
              {"\n                    "}
            </div>
            {"\n                "}
          </header>
          {"\n\n                "}
          <div className="stats-grid">
            {"\n                    "}
            <div className="stat-card glass-card animate-item delay-2">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-dollar-sign"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Revenue (30d)"}</div>
                {"\n                            "}
                <div className="stat-value">{"$124,580"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +32% vs last month"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-3">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-shopping-cart"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Total Transactions"}</div>
                {"\n                            "}
                <div className="stat-value">{"2,847"}</div>
                {"\n                            "}
                <div className="stat-trend positive">
                  <i className="fas fa-arrow-up"></i>
                  {" +245 today"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-4">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-credit-card"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Avg Transaction"}</div>
                {"\n                            "}
                <div className="stat-value">{"$43.80"}</div>
                {"\n                            "}
                <div className="stat-trend">
                  <i className="fas fa-minus"></i>
                  {" Stable"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="stat-card glass-card animate-item delay-5">
              {"\n                        "}
              <div className="stat-icon">
                <i className="fas fa-ban"></i>
              </div>
              {"\n                        "}
              <div className="stat-info">
                {"\n                            "}
                <div className="stat-label">{"Failed Transactions"}</div>
                {"\n                            "}
                <div className="stat-value">{"12"}</div>
                {"\n                            "}
                <div className="stat-trend">
                  <i className="fas fa-arrow-down"></i>
                  {" -2% vs yesterday"}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tables-grid animate-item delay-6">
            {"\n                    "}
            <div className="table-card glass-card">
              {"\n                        "}
              <h3>{"Recent Transactions"}</h3>
              {"\n                        "}
              <div className="table-wrapper">
                {"\n                            "}
                <table className="genyxo-table">
                  <thead>
                    <tr>
                      <th>{"Transaction ID"}</th>
                      <th>{"Customer"}</th>
                      <th>{"Amount"}</th>
                      <th>{"Package"}</th>
                      <th>{"Status"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <span className="bold-white">{"#TX-2026-001"}</span>
                      </td>
                      <td>{"alex_dev"}</td>
                      <td>{"$49.99"}</td>
                      <td>{"Pro Creator"}</td>
                      <td>
                        <span className="status-badge success">
                          {"✓ Completed"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"#TX-2026-002"}</span>
                      </td>
                      <td>{"maria_99"}</td>
                      <td>{"$24.99"}</td>
                      <td>{"Basic Pack"}</td>
                      <td>
                        <span className="status-badge success">
                          {"✓ Completed"}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <span className="bold-white">{"#TX-2026-003"}</span>
                      </td>
                      <td>{"john_pro"}</td>
                      <td>{"$99.99"}</td>
                      <td>{"Enterprise"}</td>
                      <td>
                        <span className="status-badge warning">
                          {"⏳ Pending"}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n        "}
      </main>
      {"\n    "}
    </div>
  );
}
