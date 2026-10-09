"use client";
import type { SyntheticEvent } from "react";

export function HomeCategoryModal({
  dispatch,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="modal" id="categoryModal">
      {"\n        "}
      <div
        className="modal-content glass"
        style={{ maxWidth: "450px", textAlign: "left" }}
      >
        {"\n            "}
        <span
          className="close-btn"
          onClick={(event) => dispatch("home-10", event)}
        >
          {"×"}
        </span>
        {"\n            \n            "}
        <h2
          id="categoryModalTitle"
          style={{ marginBottom: "5px", fontSize: "1.5rem" }}
        >
          {"Category Name"}
        </h2>
        {"\n            "}
        <p
          id="categoryModalDesc"
          style={{
            color: "var(--text-gray)",
            fontSize: "0.9rem",
            marginBottom: "20px",
          }}
        >
          {"Category description..."}
        </p>
        {"\n            \n            "}
        <div id="categoryModalList" className="category-modal-list"></div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
