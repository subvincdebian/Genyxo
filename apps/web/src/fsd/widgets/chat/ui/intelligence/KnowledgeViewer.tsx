"use client";
import { useEffect, useState } from "react";
import { Floating } from "./shared";

export type KnowledgeTarget = { anchor: HTMLElement; sourceId: number; chunkId?: number };

type Passage = {
  source: { id: number; title: string; kind: string; url: string | null; pages: number };
  passage: { id: number; page: number | null; heading: string | null; text: string };
  before: string | null;
  after: string | null;
};

/** "/knowledge/12?chunk=88" → ids, or null for any other link. */
export function parseKnowledgeLink(href: string) {
  const match = /^\/knowledge\/(\d+)(?:\?chunk=(\d+))?/.exec(href);
  return match ? { sourceId: Number(match[1]), chunkId: match[2] ? Number(match[2]) : undefined } : null;
}

/** Turns numbered knowledge links in answers into "Contract.pdf · p. 4" pills. */
export function decorateKnowledgeLinks(root: ParentNode) {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="/knowledge/"]:not(.gx-kcite)').forEach((link) => {
    const label = (link.getAttribute("title") || "").trim();
    link.classList.add("gx-kcite");
    link.removeAttribute("target");
    if (label) {
      link.dataset.number = (link.textContent || "").trim();
      link.textContent = label.replace(/, p\. (\d+)$/, " · p. $1");
    }
  });
}

/** The cited passage, read from the knowledge base, next to the citation. */
export function KnowledgeViewer({ target, onClose }: { target: KnowledgeTarget | null; onClose: () => void }) {
  const [data, setData] = useState<Passage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!target) return;
    const abort = new AbortController();
    queueMicrotask(() => {
      setData(null);
      setError("");
    });
    fetch(`/api/chat/workspace/knowledge/${target.sourceId}/passage${target.chunkId ? `?chunk=${target.chunkId}` : ""}`, {
      signal: abort.signal,
      headers: { Authorization: `Bearer ${localStorage.getItem("authToken") || ""}` },
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "This source is no longer available");
        setData(body);
      })
      .catch((caught) => {
        if (!abort.signal.aborted) setError(caught.message);
      });
    return () => abort.abort();
  }, [target]);

  return (
    <Floating anchor={target?.anchor || null} open={Boolean(target)} onClose={onClose} label="Cited passage" width={400} className="gx-kview">
      {error ? (
        <p className="gx-ai-why-warn">{error}</p>
      ) : !data ? (
        <div className="gx-ask-shimmer" aria-busy="true"><i /><i /><i /></div>
      ) : (
        <div className="gx-kview-body">
          <header>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
              <path d="M14 3v5h5" />
            </svg>
            <span className="gx-kview-title">
              <strong>{data.source.title}</strong>
              <small>
                {[data.passage.page ? `Page ${data.passage.page}${data.source.pages ? ` of ${data.source.pages}` : ""}` : "", data.passage.heading || ""].filter(Boolean).join(" · ") || "Project knowledge"}
              </small>
            </span>
          </header>
          <div className="gx-kview-text">
            {data.before && <p className="gx-kview-context">…{data.before.slice(-220)}</p>}
            <p className="gx-kview-passage">{data.passage.text}</p>
            {data.after && <p className="gx-kview-context">{data.after.slice(0, 220)}…</p>}
          </div>
          {data.source.url && (
            <a className="gx-kview-open" href={data.source.url} target="_blank" rel="noopener noreferrer">
              Open original
            </a>
          )}
        </div>
      )}
    </Floating>
  );
}
