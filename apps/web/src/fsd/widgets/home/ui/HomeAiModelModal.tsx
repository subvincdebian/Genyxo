"use client";
import type { SyntheticEvent } from "react";

export function HomeAiModelModal({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="modal" id="aiModelModal">
      {"\n        "}
      <div
        className="modal-content glass"
        style={{ maxWidth: "500px", textAlign: "left" }}
      >
        {"\n            "}
        <span
          className="close-btn"
          onClick={(event) => dispatch("home-9", event)}
        >
          {"×"}
        </span>
        {"\n            \n            "}
        <div className="ai-modal-header">
          {"\n                "}
          <div className="ai-modal-icon-wrapper">
            {"\n                    "}
            <i
              id="aiModelIcon"
              className="fas fa-robot fa-2x"
              style={{ color: "#10e6cc" }}
            ></i>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="ai-modal-title-group">
            {"\n                    "}
            <h2 id="aiModelTitle">{"Name of the Model"}</h2>
            {"\n                    "}
            <div id="aiModelCompany" className="ai-modal-company">
              {"Google"}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n            \n            "}
        <p id="aiModelDesc" className="ai-modal-desc">
          {"Description of the model will be here..."}
        </p>
        {"\n            \n            "}
        <button
          disabled={!ready}
          id="aiModelSelectBtn"
          className="submit-btn glow-on-hover"
          style={{ marginBottom: "20px", width: "100%" }}
        >
          {"\n                Use this model\n            "}
        </button>
        {"\n\n            "}
        <h3
          style={{
            fontSize: "1rem",
            marginBottom: "10px",
            color: "var(--text-light)",
          }}
        >
          {"Model Comparison"}
        </h3>
        {"\n            "}
        <div className="ai-comparison-container">
          {"\n                "}
          <table className="ai-comparison-table">
            <thead>
              <tr>
                <th>{"Feature"}</th>
                <th id="compModel1">{"Gemini"}</th>
                <th id="compModel2">{"GPT-4"}</th>
                <th id="compModel3">{"Claude"}</th>
              </tr>
            </thead>
            <tbody id="aiComparisonBody"></tbody>
          </table>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
