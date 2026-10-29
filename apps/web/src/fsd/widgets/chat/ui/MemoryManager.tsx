"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { workspaceRequest } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon } from "@/shared/ui/workspace";

type Memory = { id: number; content: string; createdAt?: string };

/**
 * Settings → Memory, as in ChatGPT, laid out like an Apple settings page:
 * a switch to stop using memories, then the saved facts in one grouped list
 * that ends with a field to add one. Each fact can be forgotten, or all of them.
 */
export function MemoryManager() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Memory[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [memory, preferences] = await Promise.all([
        workspaceRequest<{ items: Memory[] }>("memory?projectId="),
        workspaceRequest<{ memory?: boolean }>("preferences"),
      ]);
      setItems(memory.items || []);
      setEnabled(preferences.memory !== false);
      setError("");
    } catch (caught) {
      setItems([]);
      setError(caught instanceof Error ? caught.message : "Memory is unavailable");
    }
  }, []);

  useEffect(() => {
    const show = () => { setOpen(true); setConfirmAll(false); void load(); };
    document.addEventListener("genyxo:open-memory", show);
    return () => document.removeEventListener("genyxo:open-memory", show);
  }, [load]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); await load(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Something went wrong"); } finally { setBusy(false); }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    void run(() => workspaceRequest("memory", { method: "POST", body: JSON.stringify({ content }) }));
  };
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    void run(() => workspaceRequest("preferences", { method: "PATCH", body: JSON.stringify({ memory: next }) }));
  };

  if (!open) return null;
  return <WorkspaceDialog title="Memory" onClose={() => setOpen(false)} className="gx-memory-dialog">
    <p className="gx-memory-lead">Genyxo remembers useful things you share, like your work, tools and preferences, so answers fit you. It never saves passwords or other secrets.</p>
    <div className="gx-group">
      <button type="button" role="switch" aria-checked={enabled} className="gx-group-row gx-memory-switch" onClick={toggle} disabled={busy}>
        <span><strong>Reference saved memories</strong><small>{enabled ? "Used and updated in new chats" : "Kept, but not used or added to"}</small></span>
        <span className="gx-switch" aria-hidden="true"><span /></span>
      </button>
    </div>
    <h3 className="gx-group-label">Saved memories{items?.length ? <span>{items.length}</span> : null}</h3>
    {error && <p className="wp-error" role="alert">{error}</p>}
    <ul className="gx-group gx-memory-list" aria-busy={!items}>
      {!items && <li className="gx-group-row gx-memory-loading" aria-hidden="true"><span /></li>}
      {items?.length === 0 && <li className="gx-group-row gx-memory-empty">Nothing saved yet. Tell Genyxo about yourself in any chat, or add something below.</li>}
      {items?.map((item) => <li key={item.id} className="gx-group-row">
        <span>{item.content}</span>
        <button type="button" aria-label={`Forget: ${item.content}`} title="Forget" disabled={busy} onClick={() => void run(() => workspaceRequest(`memory/${item.id}`, { method: "DELETE" }))}><WorkspaceIcon name="trash" size={15} /></button>
      </li>)}
      <li className="gx-group-row gx-memory-add">
        <form onSubmit={add}>
          <input value={draft} maxLength={300} placeholder="Add a memory…" aria-label="Add a memory" onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" aria-label="Add" disabled={!draft.trim() || busy}><WorkspaceIcon name="arrow-up" size={15} /></button>
        </form>
      </li>
    </ul>
    {Boolean(items?.length) && <div className="gx-memory-footer">
      {confirmAll
        ? <><span>Forget all {items!.length} memories?</span><button type="button" onClick={() => setConfirmAll(false)}>Cancel</button><button type="button" className="is-danger" disabled={busy} onClick={() => void run(async () => { for (const item of items!) await workspaceRequest(`memory/${item.id}`, { method: "DELETE" }); setConfirmAll(false); })}>Forget all</button></>
        : <button type="button" className="is-danger-link" onClick={() => setConfirmAll(true)}>Forget all memories</button>}
    </div>}
  </WorkspaceDialog>;
}
