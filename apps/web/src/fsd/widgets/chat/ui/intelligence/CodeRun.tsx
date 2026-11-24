"use client";
import { useState } from "react";

export type CodeRunData = {
  code: string;
  ok: boolean;
  stdout: string;
  error: string | null;
  seconds: number;
  files: { id: string; name: string; mime: string; size: number; url: string }[];
};

const isImage = (mime: string) => /^image\/(png|jpeg|webp|gif)$/.test(mime);

function size(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function kindOf(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["xlsx", "xls", "csv", "tsv"].includes(ext)) return { label: ext === "csv" || ext === "tsv" ? "CSV" : "Excel", tone: "sheet" };
  if (ext === "pdf") return { label: "PDF", tone: "pdf" };
  if (["docx", "doc"].includes(ext)) return { label: "Word", tone: "doc" };
  if (["json", "txt", "md"].includes(ext)) return { label: ext.toUpperCase(), tone: "text" };
  return { label: ext ? ext.toUpperCase() : "File", tone: "text" };
}

/** "Ran Python": the result of a sandbox run, with its charts and files. */
export function CodeRunCard({ data }: { data: CodeRunData }) {
  const [showCode, setShowCode] = useState(false);
  const [wide, setWide] = useState<string | null>(null);
  const images = data.files.filter((file) => isImage(file.mime));
  const files = data.files.filter((file) => !isImage(file.mime));
  const output = data.stdout.trim();
  return (
    <section className="gx-run" data-ok={data.ok || undefined} aria-label="Python run">
      <header className="gx-run-head">
        <span className="gx-run-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m8 9-3 3 3 3M16 9l3 3-3 3M13.5 6l-3 12" />
          </svg>
        </span>
        <strong>{data.ok ? "Ran Python" : "Python stopped"}</strong>
        <span className="gx-run-meta">{data.seconds ? `${data.seconds.toFixed(1)} s` : ""}</span>
        <button type="button" className="gx-run-toggle" aria-expanded={showCode} onClick={() => setShowCode(!showCode)}>
          {showCode ? "Hide code" : "Show code"}
        </button>
      </header>
      {showCode && <pre className="gx-run-code"><code>{data.code}</code></pre>}
      {data.error && <p className="gx-run-error">{data.error}</p>}
      {output && <pre className="gx-run-output">{output}</pre>}
      {images.length > 0 && (
        <div className="gx-run-charts">
          {images.map((image) => (
            <button key={image.id} type="button" className="gx-run-chart" onClick={() => setWide(image.url)} aria-label={`Open ${image.name}`}>
              <img src={image.url} alt={image.name} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="gx-run-files">
          {files.map((file) => {
            const kind = kindOf(file.name);
            return (
              <li key={file.id}>
                <a href={file.url} download={file.name}>
                  <span className="gx-run-file-icon" data-tone={kind.tone}>{kind.label}</span>
                  <span className="gx-run-file-copy">
                    <strong>{file.name}</strong>
                    <small>{size(file.size)}</small>
                  </span>
                  <span className="gx-run-download" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
                    </svg>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      {wide && (
        <div className="gx-run-lightbox" role="dialog" aria-label="Chart" onClick={() => setWide(null)}>
          <img src={wide} alt="" />
          <a href={wide} download onClick={(event) => event.stopPropagation()}>Download chart</a>
        </div>
      )}
    </section>
  );
}
