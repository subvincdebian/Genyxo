"use client";
import type { SyntheticEvent } from "react";

export function ChatImageEditorModal({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div
      id="imageEditorModal"
      className="editor-modal"
      style={{ display: "none" }}
    >
      {"\n    "}
      <div className="editor-header">
        {"\n        "}
        <button
          disabled={!ready}
          id="editorCloseBtn"
          className="editor-btn text-btn"
        >
          {"\n            "}
          <i className="fas fa-arrow-left"></i>
          {" Назад\n        "}
        </button>
        {"\n        "}
        <div className="editor-actions">
          {"\n            "}
          <button
            disabled={!ready}
            id="editorUndoBtn"
            className="editor-btn icon-btn"
            title="Відмінити (Ctrl+Z)"
          >
            {"\n                "}
            <i className="fas fa-undo"></i>
            {"\n            "}
          </button>
          {"\n            "}
          <button
            disabled={!ready}
            id="editorRedoBtn"
            className="editor-btn icon-btn"
            title="Повторити (Ctrl+Y)"
          >
            {"\n                "}
            <i className="fas fa-redo"></i>
            {"\n            "}
          </button>
          {"\n            "}
          <button
            disabled={!ready}
            id="editorSaveBtn"
            className="editor-btn save-btn"
          >
            {"\n                "}
            <i className="fas fa-check"></i>
            {" Зберегти\n            "}
          </button>
          {"\n        "}
        </div>
        {"\n    "}
      </div>
      {"\n    \n    "}
      <div className="editor-body">
        {"\n        "}
        <div className="canvas-container">
          {"\n            "}
          <canvas id="editorCanvas"></canvas>
          {"\n        "}
        </div>
        {"\n    "}
      </div>
      {"\n    \n    "}
      <div className="editor-toolbar">
        {"\n        "}
        <div className="tool-group">
          {"\n            "}
          <button
            disabled={!ready}
            id="toolBrush"
            className="tool-btn active"
            title="Малювати пензлем"
          >
            {"\n                "}
            <i className="fas fa-paint-brush"></i>
            {"\n            "}
          </button>
          {"\n            "}
          <button
            disabled={!ready}
            id="toolText"
            className="tool-btn"
            title="Додати текст"
          >
            {"\n                "}
            <i className="fas fa-font"></i>
            {"\n            "}
          </button>
          {"\n        "}
        </div>
        {"\n        \n        "}
        <div className="color-group">
          {"\n            "}
          <span className="color-picker-wrapper" title="Кастомний колір">
            {"\n                "}
            <input
              disabled={!ready}
              type="color"
              id="editorColorPicker"
              defaultValue="#ff0000"
            />
            {"\n            "}
          </span>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset active"
            data-color="#ff0000"
            style={{ backgroundColor: "#ff0000" }}
          ></button>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset"
            data-color="#00ff00"
            style={{ backgroundColor: "#00ff00" }}
          ></button>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset"
            data-color="#0000ff"
            style={{ backgroundColor: "#0000ff" }}
          ></button>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset"
            data-color="#ffff00"
            style={{ backgroundColor: "#ffff00" }}
          ></button>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset"
            data-color="#ffffff"
            style={{ backgroundColor: "#ffffff" }}
          ></button>
          {"\n            "}
          <button
            disabled={!ready}
            className="color-preset"
            data-color="#000000"
            style={{ backgroundColor: "#000000" }}
          ></button>
          {"\n        "}
        </div>
        {"\n        \n        "}
        <div className="brush-size-group">
          {"\n            "}
          <i className="fas fa-minus small-icon"></i>
          {"\n            "}
          <input
            disabled={!ready}
            type="range"
            id="brushSize"
            min="2"
            max="25"
            defaultValue="6"
          />
          {"\n            "}
          <i className="fas fa-plus large-icon"></i>
          {"\n        "}
        </div>
        {"\n    "}
      </div>
      {"\n"}
    </div>
  );
}
