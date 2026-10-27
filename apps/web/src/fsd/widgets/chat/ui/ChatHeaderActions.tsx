"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useWorkspace, workspaceRequest } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";

type ShareState = { shared: false } | { shared: true; token: string; path: string; sharedAt: string; upToDate: boolean };

/** Brand marks for the share targets, drawn in the current colour. */
const TARGETS: { id: string; label: string; icon: ReactNode; url: (link: string, title: string) => string }[] = [
  { id: "x", label: "X", icon: <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2.3 3h6.2l4.3 5.7L17.8 3Zm-1 16.2h1.7L7.3 4.7H5.5l11.3 14.5Z" /></svg>, url: (link, title) => `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(link)}` },
  { id: "telegram", label: "Telegram", icon: <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="currentColor" d="M21.4 4.2 18.3 19c-.2 1-.9 1.3-1.7.8l-4.8-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.1 12.8l-4.7-1.5c-1-.3-1-1 .2-1.5L20 2.7c.9-.3 1.6.2 1.4 1.5Z" /></svg>, url: (link, title) => `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(title)}` },
  { id: "whatsapp", label: "WhatsApp", icon: <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.6-.4Z" /></svg>, url: (link, title) => `https://wa.me/?text=${encodeURIComponent(`${title} ${link}`)}` },
  { id: "linkedin", label: "LinkedIn", icon: <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm6.5 0h3.8v1.6h.1a4.2 4.2 0 0 1 3.8-2c4 0 4.8 2.6 4.8 6V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21h-4V9.5Z" /></svg>, url: (link) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { id: "reddit", label: "Reddit", icon: <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="currentColor" d="M21.5 12a2.1 2.1 0 0 0-3.6-1.5 10.3 10.3 0 0 0-5.6-1.8l1-4.5 3.1.7a1.5 1.5 0 1 0 .2-1l-3.6-.8a.5.5 0 0 0-.6.4l-1.1 5.2a10.4 10.4 0 0 0-5.7 1.8 2.1 2.1 0 1 0-2.3 3.5 4 4 0 0 0 0 .6c0 3.2 3.7 5.8 8.3 5.8s8.3-2.6 8.3-5.8a4 4 0 0 0 0-.6 2.1 2.1 0 0 0 1.6-2Zm-14 1.5a1.5 1.5 0 1 1 1.5 1.5 1.5 1.5 0 0 1-1.5-1.5Zm8.4 4a5.6 5.6 0 0 1-3.9 1.2 5.6 5.6 0 0 1-3.9-1.2.4.4 0 0 1 .5-.6 4.8 4.8 0 0 0 3.4 1 4.8 4.8 0 0 0 3.4-1 .4.4 0 0 1 .5.6Zm-.4-2.5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5Z" /></svg>, url: (link, title) => `https://www.reddit.com/submit?url=${encodeURIComponent(link)}&title=${encodeURIComponent(title)}` },
];

/** The first question and answer on screen, for the preview card. */
function chatPreview() {
  // Text only: cards (tasks, maps, sources) and code are left out.
  const text = (selector: string) => {
    const element = document.querySelector<HTMLElement>(`#chatBox ${selector}`);
    if (!element) return "";
    const copy = element.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".gx-rich-slot, .gx-map-card-slot, pre, .code-block-wrapper").forEach((node) => node.remove());
    return (copy.textContent || "").replace(/\s+/g, " ").trim();
  };
  return { question: text(".user-message .message-text").slice(0, 120), answer: text(".bot-message .message-text").slice(0, 220) };
}

/**
 * Share, as in ChatGPT: a public link to a snapshot of the chat with a
 * preview of how it looks in messengers, then copy or send it anywhere.
 */
function ShareDialog({ chatId, title, onClose }: { chatId: number; title: string; onClose: () => void }) {
  const [state, setState] = useState<ShareState | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [preview] = useState(chatPreview);
  useEffect(() => { void workspaceRequest<ShareState>(`conversations/${chatId}/share`).then(setState, (caught) => { setState({ shared: false }); setError(caught.message); }); }, [chatId]);
  const link = state?.shared ? `${location.origin}${state.path}` : "";
  const act = async (method: "POST" | "DELETE") => {
    setBusy(true); setError("");
    try {
      const next = await workspaceRequest<ShareState>(`conversations/${chatId}/share`, { method });
      setState(next);
      if (method === "POST" && next.shared) await copy(`${location.origin}${next.path}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't update the link"); }
    finally { setBusy(false); }
  };
  const copy = async (value = link) => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* the field stays selectable */ }
  };
  return <WorkspaceDialog title="Share chat" onClose={onClose} className="gx-share-dialog">
    <div className="gx-share-preview" aria-hidden="true">
      <div className="gx-share-preview-brand"><img src="/images/logo.svg" alt="" width={18} height={18} /><span>Genyxo</span><em>Shared chat</em></div>
      <strong>{title}</strong>
      {preview.question && <span className="gx-share-preview-q">{preview.question}</span>}
      {preview.answer && <p>{preview.answer}</p>}
    </div>
    <p className="gx-share-note">{state?.shared && !state.upToDate ? "New messages since you shared stay private until you update the link." : "Anyone with the link can view this chat. Messages you send later stay private until you update the link."}</p>
    <div className="gx-share-link">
      {state === null ? <span className="gx-share-link-text is-loading" /> : <span className="gx-share-link-text">{link || `${location.host}/share/…`}</span>}
      {state?.shared
        ? <button type="button" className="gx-share-primary" onClick={() => void (state.upToDate ? copy() : act("POST"))} disabled={busy}>{copied ? <><WorkspaceIcon name="check" size={15} />Copied</> : state.upToDate ? <><WorkspaceIcon name="copy" size={15} />Copy link</> : "Update link"}</button>
        : <button type="button" className="gx-share-primary" onClick={() => void act("POST")} disabled={busy || state === null}>{busy ? "Creating…" : "Create link"}</button>}
    </div>
    {error && <p className="wp-error" role="alert">{error}</p>}
    {state?.shared && <>
      <div className="gx-share-targets">
        {TARGETS.map((target) => <a key={target.id} href={target.url(link, title)} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${target.label}`}><span>{target.icon}</span><small>{target.label}</small></a>)}
        {typeof navigator !== "undefined" && "share" in navigator && <button type="button" aria-label="More options" onClick={() => void navigator.share({ title, url: link }).catch(() => undefined)}><span><WorkspaceIcon name="more" size={20} /></span><small>More</small></button>}
      </div>
      <button type="button" className="gx-share-delete" disabled={busy} onClick={() => void act("DELETE")}>Delete link</button>
    </>}
  </WorkspaceDialog>;
}

/** Share and ⋯ beside the credits, for the open chat. */
export function ChatHeaderActions() {
  const workspace = useWorkspace();
  const id = workspace.selectedChatId;
  const chat = workspace.conversations.find((item) => item.id === id);
  const [share, setShare] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menu = Boolean(menuAnchor);
  const setMenu = (open: boolean) => { if (!open) setMenuAnchor(null); };
  const [rename, setRename] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = useCallback(async (body: Record<string, unknown>) => {
    if (!id) return;
    setMenu(false);
    try { await workspaceRequest(`conversations/${id}`, { method: "PATCH", body: JSON.stringify(body) }); await workspace.refresh(); }
    catch (caught) { workspace.notify(caught instanceof Error ? caught.message : "Couldn't update the chat", "error"); }
  }, [id, workspace]);
  if (!id || !chat) return null;
  return <div className="gx-chat-actions">
    <WorkspaceTooltip label="Share" side="bottom">
      <button type="button" className="gx-chat-action is-share" onClick={() => setShare(true)}><WorkspaceIcon name="share" size={17} /><span>Share</span></button>
    </WorkspaceTooltip>
    <WorkspaceTooltip label="More" side="bottom" disabled={menu}>
      <button type="button" className="gx-chat-action" aria-label="Chat options" aria-haspopup="menu" aria-expanded={menu} onClick={(event) => setMenuAnchor(menu ? null : event.currentTarget)}><WorkspaceIcon name="more" size={18} /></button>
    </WorkspaceTooltip>
    {menu && <WorkspaceMenu trigger={menuAnchor} onClose={() => setMenu(false)} className="gx-chat-menu">
      <button type="button" role="menuitem" className="ws-sidebar-menu-item" onClick={() => { setMenu(false); setRename(chat.title); }}><WorkspaceIcon name="edit" size={16} /><span>Rename</span></button>
      <button type="button" role="menuitem" className="ws-sidebar-menu-item" onClick={() => void patch({ pinned: !chat.pinnedAt })}><WorkspaceIcon name="pin" size={16} /><span>{chat.pinnedAt ? "Unpin" : "Pin"}</span></button>
      <button type="button" role="menuitem" className="ws-sidebar-menu-item" onClick={() => { setMenu(false); setShare(true); }}><WorkspaceIcon name="link" size={16} /><span>Share link</span></button>
      <div className="ws-menu-divider" />
      <button type="button" role="menuitem" className="ws-sidebar-menu-item" onClick={() => void patch({ archived: true }).then(() => workspace.startNewChat())}><WorkspaceIcon name="archive" size={16} /><span>Archive</span></button>
      <button type="button" role="menuitem" className="ws-sidebar-menu-item is-danger" onClick={() => { setMenu(false); setConfirmDelete(true); }}><WorkspaceIcon name="trash" size={16} /><span>Delete</span></button>
    </WorkspaceMenu>}
    {share && <ShareDialog chatId={id} title={chat.title} onClose={() => setShare(false)} />}
    {rename !== null && <WorkspaceDialog title="Rename chat" onClose={() => setRename(null)}>
      <form className="gx-rename" onSubmit={(event) => { event.preventDefault(); if (rename.trim()) void patch({ title: rename.trim() }).then(() => setRename(null)); }}>
        <input autoFocus value={rename} maxLength={120} aria-label="Chat name" onChange={(event) => setRename(event.target.value)} />
        <div><button type="button" onClick={() => setRename(null)}>Cancel</button><button type="submit" className="is-primary" disabled={!rename.trim()}>Save</button></div>
      </form>
    </WorkspaceDialog>}
    {confirmDelete && <WorkspaceDialog title="Delete chat?" onClose={() => setConfirmDelete(false)}>
      <p className="gx-share-note">“{chat.title}” and its shared link will be deleted. This can’t be undone.</p>
      <div className="gx-rename"><div><button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" className="is-danger" onClick={() => void workspaceRequest(`conversations/${id}`, { method: "DELETE" }).then(() => { setConfirmDelete(false); workspace.startNewChat(); return workspace.refresh(); })}>Delete</button></div></div>
    </WorkspaceDialog>}
  </div>;
}
