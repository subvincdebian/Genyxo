"use client";
import { useState } from "react";
import { Floating, credits, modelIcon, type Route } from "./shared";

/** Why Auto chose this model, and other models to ask instead. */
export function RouteDetails({
  route,
  onAnswerWith,
  busy,
}: {
  route: Route;
  onAnswerWith?: (model: string) => void;
  busy?: string | null;
}) {
  return (
    <div className="gx-ai-why">
      <header className="gx-ai-why-head">
        <img src={modelIcon(route.model)} alt="" width={20} height={20} />
        <strong>{route.label}</strong>
        <span className="gx-ai-cost" data-free={route.cost === 0 || undefined}>
          {credits(route.cost)}
        </span>
      </header>
      <p className="gx-ai-why-reason">{route.reason}</p>
      {route.shortfall ? <p className="gx-ai-why-warn">You need {route.shortfall} more credits for this.</p> : null}
      {route.alternatives.length > 0 && (
        <div className="gx-ai-alts">
          <span className="gx-ai-alts-label">{onAnswerWith ? "Ask another model" : "Also good"}</span>
          {route.alternatives.map((option) =>
            onAnswerWith ? (
              <button
                key={option.model}
                type="button"
                className="gx-ai-alt"
                disabled={Boolean(busy)}
                data-busy={busy === option.model || undefined}
                onClick={() => onAnswerWith(option.model)}
              >
                <img src={modelIcon(option.model)} alt="" width={15} height={15} />
                <span>{option.label}</span>
                <em>{busy === option.model ? "Answering…" : credits(option.cost)}</em>
              </button>
            ) : (
              <span key={option.model} className="gx-ai-alt" data-static="">
                <img src={modelIcon(option.model)} alt="" width={15} height={15} />
                <span>{option.label}</span>
                <em>{credits(option.cost)}</em>
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}

/** A quiet "✦ Gemini 3.5 Flash" line above an answer Auto routed. */
export function RouteBadge({ route, answerWith }: { route: Route; answerWith: (model: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        className="gx-ai-route"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Auto chose ${route.label}. Why this model?`}
        title="Why this model?"
        onClick={() => setOpen(!open)}
      >
        <img src="/images/auto-route.svg" alt="" width={13} height={13} />
        <span>{route.label}</span>
        {route.cost > 0 && <span className="gx-ai-route-cost">{credits(route.cost)}</span>}
      </button>
      <Floating anchor={anchor} open={open} onClose={() => setOpen(false)} label="Why this model" width={320}>
        <RouteDetails
          route={route}
          busy={busy}
          onAnswerWith={async (model) => {
            setBusy(model);
            setError("");
            try {
              await answerWith(model);
              setOpen(false);
            } catch (failure) {
              setError((failure as Error).message || "That model could not answer right now.");
            } finally {
              setBusy(null);
            }
          }}
        />
        {error && (
          <p className="gx-ai-why-warn" role="alert">
            {error}
          </p>
        )}
      </Floating>
    </>
  );
}
