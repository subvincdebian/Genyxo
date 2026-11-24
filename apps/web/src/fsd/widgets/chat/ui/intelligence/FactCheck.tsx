"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { clearMarks, markQuote } from "./highlight";
import {
  Favicon,
  Floating,
  ShieldIcon,
  VERDICT_ICON,
  VERDICT_LABEL,
  credits,
  hostOf,
  modelIcon,
  useReducedMotion,
  type CheckScope,
  type CheckedClaim,
  type FactCheckResult,
  type Verdict,
} from "./shared";

export type FactCheckDetail = {
  element: HTMLElement;
  bubble: HTMLElement;
  messageId: number;
  answerModel: string;
  result: FactCheckResult | null;
  run: boolean;
  api: string;
  token: () => string;
  onBalance?: (balance: number) => void;
};

/** Models offered for a re-check, cheapest first. */
const VERIFIERS = [
  { model: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash", cost: 0 },
  { model: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", cost: 0 },
  { model: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra", cost: 0 },
  { model: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", cost: 50 },
  { model: "openai/gpt-5-mini", label: "GPT-5 Mini", cost: 70 },
  { model: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", cost: 75 },
  { model: "openai/gpt-5.1", label: "ChatGPT-5.1", cost: 150 },
];

type Pending = { id: string; quote: string; claim: string; step?: string };
type Row = Pending & Partial<CheckedClaim>;
type Phase = "idle" | "running" | "done" | "error";

const ORDER: Verdict[] = ["false", "disputed", "unverified", "supported"];

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function ScoreRing({ score, reduced }: { score: number; reduced: boolean }) {
  const [shown, setShown] = useState(reduced ? score : 0);
  useEffect(() => {
    if (reduced) return;
    const frame = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(frame);
  }, [score, reduced]);
  const tone = score >= 80 ? "good" : score >= 50 ? "mixed" : "poor";
  const circumference = 2 * Math.PI * 15;
  return (
    <span className="gx-fc-ring" data-tone={tone} role="img" aria-label={`Reliability ${score} out of 100`}>
      <svg viewBox="0 0 36 36" width="30" height="30" aria-hidden="true">
        <circle cx="18" cy="18" r="15" className="gx-fc-ring-track" />
        <circle
          cx="18"
          cy="18"
          r="15"
          className="gx-fc-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown / 100)}
        />
      </svg>
      <strong>{score}</strong>
    </span>
  );
}

function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

const SCOPES: { value: CheckScope; label: string }[] = [
  { value: "documents", label: "Your files" },
  { value: "both", label: "Files + web" },
  { value: "web", label: "Web" },
];

/** "Supply agreement.pdf", "2 files", "the web"… for the card's footer. */
function againstLabel(scope: CheckScope | undefined, documents: string[] = []) {
  const files = documents.length === 1 ? documents[0] : `${documents.length} files`;
  if (scope === "documents") return files;
  if (scope === "both") return `${files} and the web`;
  return "the web";
}

function ClaimDetails({ claim }: { claim: CheckedClaim }) {
  return (
    <div className="gx-fc-detail" data-verdict={claim.verdict}>
      <span className="gx-fc-verdict" data-verdict={claim.verdict}>
        {VERDICT_ICON[claim.verdict]}
        {VERDICT_LABEL[claim.verdict]}
        {claim.confidence < 0.45 && <small>· low confidence</small>}
      </span>
      <p className="gx-fc-explain">{claim.explanation}</p>
      {claim.correction && <p className="gx-fc-correction">{claim.correction}</p>}
      {claim.sources
        .filter((source) => source.kind === "document")
        .slice(0, 2)
        .map((source, index) => (
          <figure key={`${source.title}-${index}`} className="gx-fc-quote">
            <figcaption>
              <DocIcon />
              {source.title}
            </figcaption>
            {source.excerpt && <blockquote>{source.excerpt}</blockquote>}
          </figure>
        ))}
      {claim.sources.some((source) => source.kind !== "document") && (
        <ul className="gx-fc-sources">
          {claim.sources.filter((source) => source.kind !== "document").filter((source, index, all) => all.findIndex((other) => hostOf(other.url) === hostOf(source.url)) === index).slice(0, 3).map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" title={source.title}>
                <Favicon url={source.url} size={14} />
                <span>{hostOf(source.url)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A second model checks an answer: claims stream in as they are found, each
 * one is underlined in the answer and settles into a verdict with sources.
 */
export function FactCheckCard({ detail, signal }: { detail: FactCheckDetail; signal: number }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(detail.result ? "done" : "idle");
  const [result, setResult] = useState<FactCheckResult | null>(detail.result);
  const [rows, setRows] = useState<Row[]>(detail.result?.claims || []);
  const [step, setStep] = useState("");
  const [scope, setScope] = useState<{ scope?: CheckScope; documents: string[] }>({
    scope: detail.result?.scope,
    documents: detail.result?.documents || [],
  });
  const [verifier, setVerifier] = useState({ model: detail.result?.verifier || "", label: detail.result?.verifierLabel || "" });
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [underline, setUnderline] = useState(true);
  const [active, setActive] = useState<{ id: string; anchor: HTMLElement; pinned: boolean } | null>(null);
  const [menu, setMenu] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLButtonElement | null>(null);
  const card = useRef<HTMLElement>(null);
  const abort = useRef<AbortController | null>(null);
  const hoverTimer = useRef(0);
  const lastSignal = useRef(-1);
  const content = useMemo(() => detail.bubble.querySelector<HTMLElement>(".message-content"), [detail.bubble]);

  const run = useCallback(
    async (model?: string, wanted?: CheckScope) => {
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      setPhase("running");
      setError("");
      setRows([]);
      setResult(null);
      setStep("Starting the check");
      setActive(null);
      try {
        const response = await fetch(`${detail.api}/chat/messages/${detail.messageId}/fact-check`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${detail.token()}` },
          body: JSON.stringify({ ...(model ? { model } : {}), ...(wanted ? { scope: wanted } : {}) }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(Array.isArray(data.message) ? data.message.join(". ") : data.message || "The fact-check could not start.");
        }
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        while (!finished) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            let event: { status?: string; [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }
            if (event.status === "verifier") setVerifier({ model: event.verifier, label: event.verifierLabel });
            else if (event.status === "scope") setScope({ scope: event.scope, documents: event.documents || [] });
            else if (event.status === "step") setStep(event.step);
            else if (event.status === "claims") {
              setRows(event.claims);
              setStep(event.claims.length ? `Checking ${event.claims.length} claim${event.claims.length === 1 ? "" : "s"}` : "Wrapping up");
            } else if (event.status === "claim-step")
              setRows((old) => old.map((row) => (row.id === event.id ? { ...row, step: event.step } : row)));
            else if (event.status === "verdict")
              setRows((old) => old.map((row) => (row.id === event.claim.id ? { ...row, ...event.claim, step: undefined } : row)));
            else if (event.status === "done") {
              finished = true;
              setResult(event.result);
              setRows(event.result.claims);
              setPhase("done");
              setExpanded(event.result.claims.some((claim: CheckedClaim) => claim.verdict !== "supported"));
              if (typeof event.creditBalance === "number") detail.onBalance?.(event.creditBalance);
            } else if (event.status === "error") throw new Error(event.error);
          }
        }
        if (!finished) throw new Error("The connection closed before the check finished.");
      } catch (failure) {
        if (controller.signal.aborted) return;
        setError((failure as Error).message);
        setPhase("error");
      }
    },
    [detail],
  );

  // The "Check facts" action: starts a check, or brings the finished one into view.
  useEffect(() => {
    if (signal === lastSignal.current) return;
    lastSignal.current = signal;
    if (!detail.run) return;
    queueMicrotask(() => {
      if (phase === "idle" || phase === "error") void run();
      else {
        setExpanded(true);
        card.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
        card.current?.animate?.([{ boxShadow: "0 0 0 0 var(--gx-fc-flash)" }, { boxShadow: "0 0 0 6px transparent" }], { duration: 700 });
      }
    });
  }, [signal, detail.run, phase, run, reduced]);

  useEffect(() => () => abort.current?.abort(), []);

  // Underlines in the answer, refreshed as claims arrive and settle.
  useLayoutEffect(() => {
    if (!content) return;
    clearMarks(content);
    if (!underline) return;
    rows.forEach((row) => {
      if (!row.quote) return;
      const verdict = row.verdict || "pending";
      markQuote(content, row.quote, {
        "data-claim": row.id,
        "data-verdict": verdict,
        "data-reduced": reduced ? "true" : "false",
      }).forEach((mark, index) => {
        if (index === 0) {
          mark.tabIndex = 0;
          mark.setAttribute("role", "button");
          mark.setAttribute("aria-label", `Fact-check: ${row.verdict ? VERDICT_LABEL[row.verdict] : "checking"}. Show details`);
        }
      });
    });
    return () => clearMarks(content);
  }, [content, rows, underline, reduced]);

  // Hover or press an underline to see its verdict.
  useEffect(() => {
    if (!content) return;
    const markOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.("mark.gx-claim") as HTMLElement | null;
    const first = (mark: HTMLElement) => content.querySelector<HTMLElement>(`mark.gx-claim[data-claim="${mark.dataset.claim}"]`) || mark;
    const over = (event: PointerEvent) => {
      const mark = markOf(event.target);
      if (!mark || event.pointerType === "touch") return;
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => {
        setActive((now) => (now?.pinned ? now : { id: mark.dataset.claim!, anchor: first(mark), pinned: false }));
      }, 180);
    };
    const out = (event: PointerEvent) => {
      if (!markOf(event.target)) return;
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = window.setTimeout(() => setActive((now) => (now?.pinned ? now : null)), 240);
    };
    const press = (event: MouseEvent | KeyboardEvent) => {
      const mark = markOf(event.target);
      if (!mark) return;
      if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.clearTimeout(hoverTimer.current);
      setActive((now) => (now?.pinned && now.id === mark.dataset.claim ? null : { id: mark.dataset.claim!, anchor: first(mark), pinned: true }));
    };
    content.addEventListener("pointerover", over);
    content.addEventListener("pointerout", out);
    content.addEventListener("click", press);
    content.addEventListener("keydown", press);
    return () => {
      window.clearTimeout(hoverTimer.current);
      content.removeEventListener("pointerover", over);
      content.removeEventListener("pointerout", out);
      content.removeEventListener("click", press);
      content.removeEventListener("keydown", press);
    };
  }, [content]);

  useEffect(() => {
    if (!content) return;
    content.querySelectorAll("mark.gx-claim").forEach((mark) => mark.classList.toggle("is-active", (mark as HTMLElement).dataset.claim === active?.id));
  }, [active, content, rows]);

  const tint = (id: string, on: boolean) =>
    content?.querySelectorAll(`mark.gx-claim[data-claim="${id}"]`).forEach((mark) => mark.classList.toggle("is-hover", on));
  const focusClaim = (row: Row) => {
    const mark = content?.querySelector<HTMLElement>(`mark.gx-claim[data-claim="${row.id}"]`);
    if (!mark) return null;
    mark.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    content!.querySelectorAll<HTMLElement>(`mark.gx-claim[data-claim="${row.id}"]`).forEach((part) => {
      part.classList.remove("is-flash");
      void part.offsetWidth;
      part.classList.add("is-flash");
    });
    return mark;
  };

  if (phase === "idle") return null;
  const done = rows.filter((row) => row.verdict).length;
  const activeClaim = rows.find((row) => row.id === active?.id && row.verdict) as CheckedClaim | undefined;
  const pendingClaim = rows.find((row) => row.id === active?.id && !row.verdict);
  const sorted = phase === "done" ? [...rows].sort((a, b) => ORDER.indexOf(a.verdict!) - ORDER.indexOf(b.verdict!)) : rows;
  const subtitle =
    phase === "running"
      ? step
      : phase === "error"
        ? error
        : result && result.claims.length
          ? [
              `${result.counts.supported} of ${result.claims.length} supported`,
              result.counts.false ? `${result.counts.false} likely wrong` : "",
              result.counts.disputed ? `${result.counts.disputed} disputed` : "",
              result.counts.unverified ? `${result.counts.unverified} unverified` : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : "Nothing specific to check";
  const canOpen = phase === "done" && sorted.length > 0;

  return (
    <section ref={card} className="gx-fc" data-phase={phase} aria-label="Fact-check" aria-busy={phase === "running"}>
      <header className="gx-fc-head">
        <button type="button" className="gx-fc-title" aria-expanded={canOpen ? expanded : undefined} disabled={!canOpen} onClick={() => setExpanded(!expanded)}>
          {phase === "done" && result && result.claims.length ? (
            <ScoreRing score={result.score} reduced={reduced} />
          ) : (
            <span className="gx-fc-shield" data-phase={phase}>
              {phase === "running" ? <span className="gx-fc-spinner" /> : <ShieldIcon size={15} />}
            </span>
          )}
          <span className="gx-fc-copy">
            <strong>Fact-check</strong>
            <span className="gx-fc-sub" key={subtitle} data-running={phase === "running" || undefined}>
              {subtitle}
            </span>
          </span>
          {canOpen && (
            <svg className="gx-fc-chevron" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>
        {phase === "running" && (
          <button
            type="button"
            className="gx-fc-tool"
            onClick={() => {
              abort.current?.abort();
              setPhase(result ? "done" : "idle");
            }}
          >
            Cancel
          </button>
        )}
        {phase === "error" && (
          <button type="button" className="gx-fc-tool" onClick={() => void run(verifier.model || undefined, scope.scope)}>
            Try again
          </button>
        )}
        {phase === "done" && (
          <button ref={setMenuAnchor} type="button" className="gx-fc-tool" aria-label="Fact-check options" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        )}
      </header>

      {phase === "running" && (
        <div className="gx-fc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={rows.length || 1} aria-valuenow={done}>
          <i style={{ "--progress": rows.length ? done / rows.length : 0.08 } as CSSProperties} />
        </div>
      )}

      <div className="gx-fc-body" data-open={(expanded && canOpen) || (phase === "running" && rows.length > 0) || undefined}>
        <div>
        <ol className="gx-fc-list">
          {sorted.map((row, index) => (
            <li key={row.id} style={{ "--i": index } as CSSProperties} data-verdict={row.verdict || "pending"}>
              <button
                type="button"
                className="gx-fc-row"
                onClick={() => {
                  const mark = focusClaim(row);
                  if (row.verdict) setActive({ id: row.id, anchor: mark || card.current!, pinned: true });
                }}
                onMouseEnter={() => tint(row.id, true)}
                onMouseLeave={() => tint(row.id, false)}
              >
                <span className="gx-fc-row-icon" data-verdict={row.verdict || "pending"}>
                  {row.verdict ? VERDICT_ICON[row.verdict] : <span className="gx-fc-dot" />}
                </span>
                <span className="gx-fc-row-copy">
                  <span className="gx-fc-row-claim">{row.claim}</span>
                  {row.verdict && row.verdict !== "supported" && <small>{row.correction || row.explanation}</small>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        {phase === "done" && result && (
          <p className="gx-fc-foot">
            Checked by {verifier.label || result.verifierLabel} against {againstLabel(scope.scope, scope.documents)} · {timeAgo(result.checkedAt)}
          </p>
        )}
        </div>
      </div>

      <Floating
        anchor={active?.anchor || null}
        open={Boolean(active && (activeClaim || pendingClaim))}
        onClose={() => setActive(null)}
        label="Claim check"
        width={320}
        className="gx-fc-pop"
        onPointerEnter={() => window.clearTimeout(hoverTimer.current)}
        onPointerLeave={() => {
          window.clearTimeout(hoverTimer.current);
          hoverTimer.current = window.setTimeout(() => setActive((now) => (now?.pinned ? now : null)), 240);
        }}
      >
        {activeClaim ? (
          <ClaimDetails claim={activeClaim} />
        ) : pendingClaim ? (
          <div className="gx-fc-detail" data-verdict="pending">
            <span className="gx-fc-verdict" data-verdict="pending">
              <span className="gx-fc-spinner" />
              Checking…
            </span>
            <p className="gx-fc-explain">{pendingClaim.claim}</p>
          </div>
        ) : null}
      </Floating>

      <Floating anchor={menuAnchor} open={menu} onClose={() => setMenu(false)} label="Fact-check options" width={250} className="gx-fc-menu">
        <button
          type="button"
          className="gx-fc-menu-item"
          onClick={() => {
            setUnderline(!underline);
            setMenu(false);
          }}
        >
          <span>{underline ? "Hide highlights" : "Show highlights"}</span>
        </button>
        {scope.documents.length > 0 && (
          <>
            <p className="gx-fc-menu-label">Compare with</p>
            <div className="gx-fc-scopes" role="radiogroup" aria-label="Compare the answer with">
              {SCOPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={scope.scope === option.value}
                  onClick={() => {
                    setMenu(false);
                    if (scope.scope !== option.value) void run(verifier.model || undefined, option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
        <p className="gx-fc-menu-label">Check again with</p>
        <ul>
          {VERIFIERS.filter((option) => option.model !== detail.answerModel).map((option) => (
            <li key={option.model}>
              <button
                type="button"
                className="gx-fc-menu-item"
                data-current={option.model === verifier.model || undefined}
                onClick={() => {
                  setMenu(false);
                  void run(option.model, scope.scope);
                }}
              >
                <img src={modelIcon(option.model)} alt="" width={15} height={15} />
                <span>{option.label}</span>
                <em data-free={option.cost === 0 || undefined}>{credits(option.cost)}</em>
              </button>
            </li>
          ))}
        </ul>
      </Floating>
    </section>
  );
}
