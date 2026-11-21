"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type FormHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { isWorkspaceSignInError, workspaceRequest, useWorkspace } from "@/features/workspace";
import { useLanguage } from "@/shared/i18n";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";
import { pageCopy } from "../model/page-copy";
import "./workspace-pages.css";

export type Id = string | number;
export function tabKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const index = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[index]?.focus(); tabs[index]?.click();
}
/** Plugins / Skills switch shared by both catalogs; actions sit on the right. */
export function CatalogHeader({ skills, onTab, children }: { skills: boolean; onTab: (tab: "plugins" | "skills") => void; children: ReactNode }) {
  const l = useLabels();
  return <header className="wp-catalog-heading"><div className="wp-tabs wp-main-tabs" role="tablist" onKeyDown={tabKeys} aria-label={l("catalogType", "Catalog type")}><button role="tab" aria-selected={!skills} onClick={() => onTab("plugins")}>{l("plugins", "Plugins")}</button><button role="tab" aria-selected={skills} onClick={() => onTab("skills")}>{l("skills", "Skills")}</button></div><div className="wp-catalog-actions">{children}</div></header>;
}
export const jsonBody =(body: unknown, method = "POST"): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export function useLabels() { const { t, lang } = useLanguage(); return useCallback((key: string, fallback: string) => pageCopy[lang]?.[key] || t(`workspace.${key}`, fallback), [t, lang]); }
export function useResource<T>(path: string) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setState({ data: null, error: "", loading: true });
      return workspaceRequest<T>(path, { signal: controller.signal }).then((data) => {
        if (!controller.signal.aborted) setState({ data, error: "", loading: false });
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ data: null, error: error instanceof Error ? error.message : "Unable to load data", loading: false });
      });
    });
    return () => controller.abort();
  }, [path, revision]);
  return { ...state, reload: useCallback(() => setRevision((value) => value + 1), []) };
}
export function useAction(onSuccess?: () => void) {
  const { notify } = useWorkspace();
  const l = useLabels();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const run = async (action: () => Promise<unknown>) => {
    if (running.current) return false;
    running.current = true; setBusy(true); setError("");
    try { await action(); onSuccess?.(); notify(l("saved", "Saved")); return true; }
    catch (error) { setError(error instanceof Error ? error.message : l("saveError", "Unable to save changes")); return false; }
    finally { running.current = false; setBusy(false); }
  };
  return { busy, error, run };
}
const subscribeQuery = (callback: () => void) => { window.addEventListener("popstate", callback); return () => window.removeEventListener("popstate", callback); };
export function usePageQuery() {
  const search = useSyncExternalStore(subscribeQuery, () => window.location.search, () => "");
  const setQuery = (values: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(values).forEach(([key, value]) => { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); });
    window.history.pushState(null, "", url); window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return [new URLSearchParams(search), setQuery] as const;
}
export function Search({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const l = useLabels();
  const [draft, setDraft] = useState(value);
  const [composing, setComposing] = useState(false);
  useEffect(() => {
    if (composing || draft === value) return;
    const timer = setTimeout(() => onChange(draft), 300);
    return () => clearTimeout(timer);
  }, [draft, composing, value, onChange]);
  return <div className="wp-search"><WorkspaceIcon name="search" size={18} /><input type="search" aria-label={label} placeholder={label} value={draft} onChange={(event) => setDraft(event.target.value)} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} />{draft && <WorkspaceTooltip label={l("clearSearch", "Clear search")} side="bottom"><button type="button" aria-label={l("clearSearch", "Clear search")} onClick={() => { setDraft(""); onChange(""); }}><WorkspaceIcon name="close" size={16} /></button></WorkspaceTooltip>}</div>;
}
export function ResourceState({ loading, error, retry, empty, emptyTitle, emptyText, icon = "folder" }: { loading: boolean; error: string; retry: () => void; empty?: boolean; emptyTitle?: string; emptyText?: string; icon?: string }) {
  const l = useLabels();
  if (error && isWorkspaceSignInError(error)) return <div className="wp-state"><span className="gx-state-icon"><WorkspaceIcon name="lock" size={28} /></span><h2>{l("signInTitle", "Sign in to open your workspace")}</h2><p>{l("signInText", "Your chats, files, plugins and schedules are saved to your Genyxo account.")}</p><div className="gx-state-actions"><Link className="gx-btn gx-btn-primary" href="/sign-in">{l("signIn", "Sign in")}</Link><Link className="gx-btn" href="/sign-in?mode=signup">{l("signUp", "Create account")}</Link></div></div>;
  if (loading) return <div className="wp-skeletons" role="status" aria-label={l("loading", "Loading")}><span className="wp-sr">{l("loading", "Loading")}</span>{Array.from({ length: 4 }, (_, index) => <div className="wp-skeleton" aria-hidden="true" key={index} />)}</div>;
  if (error) return <div className="wp-state" role="alert"><p>{error}</p><button onClick={retry}>{l("retry", "Try again")}</button></div>;
  if (empty) return <div className="wp-state"><span className="gx-state-icon"><WorkspaceIcon name={icon} size={28} /></span><h2>{emptyTitle || l("empty", "Nothing here yet")}</h2><p>{emptyText || l("emptyHint", "Create something to get started.")}</p></div>;
  return null;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="wp-field"><span>{label}</span>{children}</label>; }
export function Form({ children, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const l = useLabels();
  const [errors, setErrors] = useState<string[]>([]);
  const errorId = useId();
  return <form {...props} noValidate onSubmit={(event) => {
    event.preventDefault();
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select"));
    const messages: string[] = [];
    let first: HTMLElement | undefined;
    for (const control of controls) {
      const missing = control.required && !control.value.trim();
      const invalid = !control.disabled && (missing || !control.checkValidity());
      control.setAttribute("aria-invalid", String(invalid));
      if (invalid) {
        first ||= control;
        control.setAttribute("aria-describedby", errorId);
        const label = control.closest("label")?.querySelector("span")?.textContent || control.name;
        messages.push(`${label}: ${missing ? l("requiredField", "This field is required.") : l("invalidField", "Enter a valid value.")}`);
      } else if (control.getAttribute("aria-describedby") === errorId) control.removeAttribute("aria-describedby");
    }
    setErrors(messages);
    if (first) { first.focus(); return; }
    onSubmit?.(event);
  }}>{errors.length > 0 && <div id={errorId} className="wp-error" role="alert">{errors.map((message, index) => <p key={index}>{message}</p>)}</div>}{children}</form>;
}
export function FormFooter({ busy, error, onClose }: { busy: boolean; error: string; onClose: () => void }) {
  const l = useLabels();
  return <>{error && <p className="wp-error" role="alert">{error}</p>}<div className="wp-form-actions"><button type="button" onClick={onClose} disabled={busy}>{l("cancel", "Cancel")}</button><button className="wp-primary" type="submit" disabled={busy}>{busy ? l("saving", "Saving…") : l("save", "Save")}</button></div></>;
}
export function ConfirmDelete({ name, message, onClose, onDelete }: { name: string; message?: string; onClose: () => void; onDelete: () => Promise<unknown> }) {
  const l = useLabels(); const action = useAction(onClose);
  return <WorkspaceDialog title={l("delete", "Delete")} onClose={onClose}><p className="wp-confirm">{message || l("deleteConfirm", "Delete this item? This cannot be undone.")} <strong>{name}</strong></p>{action.error && <p role="alert" className="wp-error">{action.error}</p>}<div className="wp-form-actions"><button onClick={onClose} disabled={action.busy}>{l("cancel", "Cancel")}</button><button className="wp-danger" disabled={action.busy} onClick={() => void action.run(onDelete)}>{l("delete", "Delete")}</button></div></WorkspaceDialog>;
}
