"use client";
import type { SyntheticEvent } from "react";

export function HomeHome({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <section className="genyxo-hero" id="home">
      {"\n        "}
      <div className="hero-glow-bg"></div>
      {"\n\n        "}
      <div className="container hero-content">
        {"\n            \n            "}
        <div className="text-column">
          {"\n                "}
          <div className="status-badge">
            {"\n                    "}
            <span className="status-dot"></span>
            {"\n                    Prepare for Future\n                "}
          </div>
          {"\n\n                "}
          <h1 className="main-title">
            {"\n                    Unlock the Power of "}
            <br />
            {"\n                    "}
            <span className="highlight-text">{"Neural Networks"}</span>
            {"\n                "}
          </h1>
          {"\n\n                "}
          <p className="description">
            {
              "\n                    Access premium AI tools, generate visuals, and automate your workflow with our next-gen platform.\n                "
            }
          </p>
          {"\n\n                "}
          <div className="button-group">
            {"\n                    "}
            <button
              disabled={!ready}
              className="btn btn-primary"
              aria-label="View Packges"
              onClick={(event) => dispatch("home-3", event)}
            >
              {"View Packages"}
            </button>
            {"\n                    "}
            <button
              disabled={!ready}
              className="btn btn-outline hero-btn"
              aria-label="View Demo"
            >
              {"View Demo"}
            </button>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="trust-badge">
            {"\n                    "}
            <span className="badge-icon">
              {"\n                        "}
              <svg
                width="12"
                height="15"
                viewBox="0 0 12 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "3px", position: "relative", top: "3px" }}
              >
                {"\n                            "}
                <path
                  d="M6.00008 14C6.00008 14 11.3334 11.3334 11.3334 7.33335V2.66669L6.00008 0.666687L0.666748 2.66669V7.33335C0.666748 11.3334 6.00008 14 6.00008 14Z"
                  stroke="white"
                  strokeOpacity="0.4"
                  strokeWidth="1.33333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                {"\n                        "}
              </svg>
              {"\n                    "}
            </span>
            {"\n                    Secure Payment\n\n                    "}
            <span className="badge-icon" style={{ marginLeft: "20px" }}>
              {"\n                        "}
              <svg
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: "3px", position: "relative", top: "3px" }}
              >
                {"\n                            "}
                <path
                  d="M14.0001 6.72384V7.33717C13.9993 8.77478 13.5337 10.1736 12.673 11.3251C11.8122 12.4765 10.6023 13.3188 9.22365 13.7264C7.84504 14.1341 6.37159 14.0851 5.02306 13.5869C3.67454 13.0887 2.52318 12.1679 1.74072 10.9619C0.958259 9.75586 0.586609 8.32921 0.681199 6.89471C0.77579 5.46021 1.33155 4.09472 2.2656 3.00188C3.19965 1.90905 4.46194 1.14742 5.86421 0.8306C7.26648 0.513776 8.73359 0.658727 10.0468 1.24384"
                  stroke="white"
                  strokeOpacity="0.4"
                  strokeWidth="1.33333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                {"\n                            "}
                <path
                  d="M14.0002 2.00385L7.3335 8.67718L5.3335 6.67718"
                  stroke="white"
                  strokeOpacity="0.4"
                  strokeWidth="1.33333"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
                {"\n                        "}
              </svg>
              {"\n                    "}
            </span>
            {"\n                    Lifetime Access\n                "}
          </div>
          {"\n\n            "}
        </div>
        {"\n\n            "}
        <div className="visual-column">
          {"\n                "}
          <div className="orbit-system">
            {"\n                    "}
            <div className="core-planet">
              {"\n                        "}
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {"\n                            "}
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path>
                {"\n                            "}
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path>
                {"\n                        "}
              </svg>
              {"\n                        "}
              <div className="core-pulse"></div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="orbit-ring inner-orbit">
              {"\n                        "}
              <div className="orbit-item item-1">
                {"\n                            "}
                <div className="icon-box">
                  {"\n                                "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="2"></rect>
                    <path d="M12 2v4"></path>
                    <path d="M12 18v4"></path>
                    <path d="M2 12h4"></path>
                    <path d="M18 12h4"></path>
                  </svg>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="orbit-item item-2">
                {"\n                            "}
                <div className="icon-box">
                  {"\n                                "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="orbit-ring outer-orbit">
              {"\n                        "}
              <div className="orbit-item item-3">
                {"\n                            "}
                <div className="icon-box">
                  {"\n                                "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="orbit-item item-4">
                {"\n                            "}
                <div className="icon-box">
                  {"\n                                "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                        "}
              <div className="orbit-item item-5">
                {"\n                            "}
                <div className="icon-box">
                  {"\n                                "}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.5 19c0-3.037-2.463-5.5-5.5-5.5S6.5 15.963 6.5 19"></path>
                    <path d="M12 13.5V4l8 8h-3"></path>
                  </svg>
                  {"\n                            "}
                </div>
                {"\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="powered-badge">
              {
                "\n                        Powered by 10+ AI Models\n                    "
              }
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n\n        "}
      <div className="bottom-wave">
        {"\n            "}
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {"\n                "}
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 40C840 33 960 27 1080 33.3C1200 40 1320 60 1380 70L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="#0a0a0a"
          ></path>
          {"\n            "}
        </svg>
        {"\n        "}
      </div>
      {"\n    "}
    </section>
  );
}
