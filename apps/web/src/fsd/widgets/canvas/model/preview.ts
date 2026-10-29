// Builds sandboxed preview documents for the canvas. Previews run in an
// iframe without allow-same-origin, so code never reaches the app session.

export type CanvasLanguage = "html" | "svg" | "javascript" | "jsx" | "markdown" | "css" | string;
export type PreviewMode = "frame" | "markdown" | "none";

const aliases: Record<string, string> = {
  htm: "html", xml: "html", markup: "html",
  js: "javascript", mjs: "javascript", cjs: "javascript", node: "javascript",
  tsx: "jsx", react: "jsx", ts: "typescript",
  md: "markdown", mdx: "markdown", document: "markdown", text: "markdown", txt: "markdown",
};

export function normalizeLanguage(language = "") {
  const value = language.toLowerCase().trim();
  return aliases[value] || value || "text";
}

export function previewMode(language: string): PreviewMode {
  const value = normalizeLanguage(language);
  if (value === "markdown") return "markdown";
  if (["html", "svg", "javascript", "jsx", "css"].includes(value)) return "frame";
  return "none";
}

const extensions: Record<string, string> = { html: "html", svg: "svg", javascript: "js", jsx: "tsx", markdown: "md", css: "css", python: "py", typescript: "ts", json: "json", bash: "sh", sql: "sql" };
export const fileExtension = (language: string) => extensions[normalizeLanguage(language)] || "txt";

// Forwards console output and runtime errors to the canvas console.
const consoleBridge = `<script>(function(){
  var send = function (level, args) {
    try {
      parent.postMessage({ __genyxoCanvas: true, level: level, args: Array.prototype.map.call(args, function (value) {
        if (typeof value === "string") return value;
        try { return JSON.stringify(value, null, 2); } catch (e) { return String(value); }
      }) }, "*");
    } catch (e) {}
  };
  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level];
    console[level] = function () { send(level, arguments); original.apply(console, arguments); };
  });
  addEventListener("error", function (event) { send("error", [event.message]); });
  addEventListener("unhandledrejection", function (event) { send("error", [String(event.reason)]); });
})();</script>`;

const baseStyle = `<style>:root{color-scheme:light dark}html,body{margin:0}body{font:15px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;padding:20px;color:#111;background:#fff}@media (prefers-color-scheme:dark){body{color:#eee;background:#141616}}</style>`;
const closeScript = (code: string) => code.replace(/<\/script/gi, "<\\/script");

function reactDocument(source: string) {
  // Imports cannot resolve inside the sandbox; React hooks come from the UMD global.
  const body = source
    .replace(/^\s*import\s+[^;]*?from\s+["']react(-dom)?(\/client)?["'];?\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+\.css["'];?\s*$/gm, "")
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, "window.__CanvasApp = $1; function $1")
    .replace(/export\s+default\s+(?!function)([A-Za-z0-9_]+)\s*;?/, "window.__CanvasApp = $1;")
    .replace(/^\s*export\s+/gm, "");
  const program = `const { useState, useEffect, useRef, useMemo, useCallback, useReducer, useContext, createContext, Fragment } = React;\n${body}\nconst __Root = window.__CanvasApp || (typeof App !== "undefined" ? App : null);\nif (!__Root) throw new Error("Export a default component to preview it.");\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(__Root));`;
  return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}${baseStyle}
<script src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js"></script>
</head><body><div id="root"></div><script>
try {
  var compiled = Babel.transform(${JSON.stringify(program).replace(/<\/script/gi, "<\\/script")}, { presets: [["react", { runtime: "classic" }], "typescript"], filename: "Canvas.tsx" }).code;
  (0, eval)(compiled);
} catch (error) { console.error(error && error.message ? error.message : String(error)); }
</script></body></html>`;
}

export function buildPreviewDocument(language: string, code: string) {
  const value = normalizeLanguage(language);
  if (value === "html") {
    if (/<head[^>]*>/i.test(code)) return code.replace(/<head([^>]*)>/i, `<head$1>${consoleBridge}`);
    if (/<html[^>]*>/i.test(code)) return code.replace(/<html([^>]*)>/i, `<html$1><head>${consoleBridge}</head>`);
    return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}${baseStyle}</head><body>${code}</body></html>`;
  }
  if (value === "svg") return `<!doctype html><html><head>${consoleBridge}<style>html,body{margin:0;height:100%}body{display:grid;place-items:center;background:repeating-conic-gradient(#f4f4f4 0 25%,#fff 0 50%) 0 0/20px 20px}svg{max-width:92vw;max-height:92vh}</style></head><body>${code}</body></html>`;
  if (value === "css") return `<!doctype html><html><head>${consoleBridge}${baseStyle}<style>${code}</style></head><body><h1>Heading</h1><p>Paragraph with <a href="#">a link</a>.</p><button>Button</button></body></html>`;
  if (value === "javascript") return `<!doctype html><html><head><meta charset="utf-8">${consoleBridge}${baseStyle}</head><body><div id="app"></div><script>${closeScript(code)}</script></body></html>`;
  if (value === "jsx") return reactDocument(code);
  return "";
}

export function suggestTitle(language: string, content: string) {
  const heading = content.match(/^#{1,3}\s+(.+)$/m)?.[1] || content.match(/<title>([^<]+)<\/title>/i)?.[1];
  if (heading) return heading.trim().slice(0, 80);
  const value = normalizeLanguage(language);
  const names: Record<string, string> = { html: "HTML page", svg: "SVG graphic", javascript: "JavaScript", jsx: "React component", markdown: "Document", css: "Stylesheet", python: "Python script", typescript: "TypeScript" };
  return names[value] || `${value.toUpperCase()} snippet`;
}
