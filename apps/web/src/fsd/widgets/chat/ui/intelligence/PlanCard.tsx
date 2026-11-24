"use client";
import { useState, type CSSProperties } from "react";

export type PlanStep = { title: string; status: "pending" | "active" | "done" | "skipped" | "blocked"; note?: string };

const LABEL: Record<PlanStep["status"], string> = {
  pending: "To do",
  active: "In progress",
  done: "Done",
  skipped: "Skipped",
  blocked: "Waiting for you",
};

function Mark({ status }: { status: PlanStep["status"] }) {
  if (status === "active") return <span className="gx-plan-spin" aria-hidden="true" />;
  if (status === "done")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.2 4.2L19 7" />
      </svg>
    );
  if (status === "blocked")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M9 7v10M15 7v10" />
      </svg>
    );
  if (status === "skipped")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 12h12" />
      </svg>
    );
  return <span className="gx-plan-dot" aria-hidden="true" />;
}

/** The agent's plan: steps with their state, updating while it works. */
export function PlanCard({ plan, live }: { plan: PlanStep[]; live: boolean }) {
  const finished = plan.filter((step) => step.status === "done" || step.status === "skipped").length;
  const blocked = plan.some((step) => step.status === "blocked");
  const complete = finished === plan.length;
  const [open, setOpen] = useState(!complete || live);
  const title = blocked ? "Waiting for your confirmation" : complete ? "Task complete" : "Working on it";
  return (
    <section className="gx-plan" data-state={blocked ? "blocked" : complete ? "done" : "working"} aria-label="Agent plan">
      <button type="button" className="gx-plan-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="gx-plan-badge">Agent</span>
        <strong>{title}</strong>
        <span className="gx-plan-count">
          {finished} of {plan.length}
        </span>
        <svg className="gx-plan-chevron" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div className="gx-plan-bar" aria-hidden="true">
        <i style={{ "--progress": plan.length ? finished / plan.length : 0 } as CSSProperties} />
      </div>
      <div className="gx-plan-body" data-open={open || undefined}>
        <ol>
          {plan.map((step, index) => (
            <li key={`${index}-${step.title}`} data-status={step.status} style={{ "--i": index } as CSSProperties}>
              <span className="gx-plan-mark">
                <Mark status={step.status} />
              </span>
              <span className="gx-plan-copy">
                <span>{step.title}</span>
                {(step.note || step.status === "blocked") && <small>{step.note || LABEL[step.status]}</small>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
