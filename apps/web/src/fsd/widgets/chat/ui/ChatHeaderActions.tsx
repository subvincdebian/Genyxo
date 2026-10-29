"use client";
import { useCallback, useState } from "react";
import { ShareDialog, useWorkspace, workspaceRequest } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";

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
