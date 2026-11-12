"use client";
import { useEffect, useState } from "react";
import { useWorkspace, type WorkspaceFile, type WorkspaceProject } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceTooltip } from "@/shared/ui/workspace";
import { ProjectIconPicker } from "@/shared/ui/project-icons";
import { useLanguage } from "@/shared/i18n";

interface Memory { id: number; content: string; enabled?: boolean; }
async function readFile(file: File): Promise<WorkspaceFile> {
  if (file.size > 4_000_000) throw new Error(`${file.name}: maximum file size is 4 MB`);
  const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error(`Unable to read ${file.name}`)); reader.onload = () => resolve(String(reader.result).split(",")[1]); reader.readAsDataURL(file); });
  return { name: file.name, mime_type: file.type || "text/plain", size: file.size, data };
}
export function WorkspaceProjectDialog({ project, onClose }: { project?: WorkspaceProject; onClose: () => void }) {
  const { request, refresh, notify, startNewChat } = useWorkspace();
  const { t } = useLanguage();
  const [tab, setTab] = useState("overview");
  const [name, setName] = useState(project?.name || "");
  const [appearance, setAppearance] = useState({ icon: project?.icon || null, color: project?.color || null });
  const [instructions, setInstructions] = useState(project?.instructions || "");
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<Array<string | number>>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memory, setMemory] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingMemory, setEditingMemory] = useState<number | null>(null);
  const [deleteMemory, setDeleteMemory] = useState<Memory | null>(null);
  const [preview, setPreview] = useState<WorkspaceFile | null>(null);
  useEffect(() => {
    if (!project || tab !== "memory") return;
    const abort = new AbortController();
    queueMicrotask(() => {
      if (abort.signal.aborted) return;
      setLoading(true);
      request<{ items: Memory[] }>(`memory?projectId=${project.id}`, { signal: abort.signal }).then((data) => { if (!abort.signal.aborted) setMemories(data.items || []); }).catch((caught) => { if (!abort.signal.aborted) setError(caught.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    });
    return () => abort.abort();
  }, [project, tab, request]);
  if (!project) return <WorkspaceDialog title={t("workspace.project", "Project")} onClose={onClose}><p role="alert">{t("workspace.project_unavailable", "This project is no longer available.")}</p></WorkspaceDialog>;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setError(t("workspace.name_required", "Enter a name")); return; }
    if ((project.files?.length || 0) - removed.length + files.length > 5) { setError(t("workspace.max_files", "A project can contain up to 5 files")); return; }
    setBusy(true); setError("");
    try {
      const additions = await Promise.all(files.map(readFile));
      await request(`projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), ...appearance, instructions, ...(additions.length ? { files: additions } : {}), ...(removed.length ? { removeFileIds: removed } : {}) }) });
      await refresh(); notify(t("workspace.project_saved", "Project saved"), "success"); onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save project"); } finally { setBusy(false); }
  };
  const addMemory = async () => {
    if (!memory.trim()) return; setBusy(true); setError("");
    try { const created = await request<Memory>(editingMemory ? `memory/${editingMemory}` : "memory", { method: editingMemory ? "PATCH" : "POST", body: JSON.stringify({ scope: "project", projectId: project.id, content: memory.trim() }) }); setMemories((items) => editingMemory ? items.map((item) => item.id === editingMemory ? created : item) : [...items, created]); setMemory(""); setEditingMemory(null); notify(t("workspace.memory_saved", "Memory saved"), "success"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save memory"); } finally { setBusy(false); }
  };
  return <><WorkspaceDialog title={project.name} onClose={onClose} wide>
    <div className="ws-project-tabs" role="tablist" aria-label={t("workspace.project_settings", "Project settings")}>{[["overview",t("workspace.overview", "Overview")],["memory",t("workspace.memory", "Memory")]].map(([key,label]) => <button key={key} role="tab" aria-selected={tab === key} className="ws-btn" onClick={() => { setError(""); setTab(key); }}>{label}</button>)}</div>
    {error && <p className="ws-inline-error" role="alert">{error}</p>}
    {tab === "overview" ? <form noValidate className="ws-form" onSubmit={save}>
      <label htmlFor="workspace-project-settings-name">{t("workspace.project_name", "Project name")}</label>
      <div className="ws-project-name-field"><ProjectIconPicker icon={appearance.icon} color={appearance.color} onChange={setAppearance} label={t("workspace.project_icon", "Project icon")} searchLabel={t("workspace.search_icons", "Search icons")} clearLabel={t("workspace.clear", "Clear")} disabled={busy}/><input id="workspace-project-settings-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required placeholder={t("workspace.project_name_placeholder", "Trip to Copenhagen")}/></div>
      <label>{t("workspace.project_instructions", "Project instructions")}<textarea className="resize-none" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} maxLength={8000}/></label>
      <p className="ws-muted">{t("workspace.project_context_help", "Instructions, shared files and saved memory are available to chats in this project.")}</p>
      <div className="ws-project-files">{(project.files || []).filter((file) => !removed.includes(file.id ?? file.name)).map((file) => <div className="ws-file-row" key={file.id ?? file.name}><WorkspaceIcon name="file" size={18}/><button className="ws-file-preview" type="button" onClick={async () => { try { setPreview(await request<WorkspaceFile>(`projects/${project.id}/files/${encodeURIComponent(file.id ?? file.name)}`)); } catch (caught) { setError((caught as Error).message); } }}>{file.name}</button><WorkspaceTooltip label={`${t("workspace.remove", "Remove")} ${file.name}`} side="bottom"><button type="button" className="ws-icon-btn" aria-label={`${t("workspace.remove", "Remove")} ${file.name}`} onClick={() => setRemoved((items) => [...items, file.id ?? file.name])}><WorkspaceIcon name="close" size={16}/></button></WorkspaceTooltip></div>)}</div>
      <label>{t("workspace.add_files", "Add shared files")}<input type="file" multiple accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.js,.ts,.py" onChange={(e) => setFiles(Array.from(e.target.files || []))}/><small>{t("workspace.file_limit", "PDF, DOCX or text · up to 5 files · 4 MB each")}</small></label>
      <div className="ws-form-actions"><button type="button" className="ws-btn" onClick={() => { onClose(); startNewChat(project.id); }}>{t("workspace.new_chat", "New chat")}</button><button className="ws-btn ws-btn-primary" type="submit" disabled={busy}>{busy ? t("workspace.saving", "Saving…") : t("workspace.save_changes", "Save changes")}</button></div>
    </form> : <div className="ws-form">
      <p className="ws-muted">{t("workspace.memory_help", "Save facts and decisions that models should remember across this project's chats.")}</p>
      {loading ? <div className="ws-skeleton" style={{ height: 80 }}/> : memories.length ? memories.map((item) => <div className="ws-memory-row" key={item.id}><input type="checkbox" checked={item.enabled !== false} disabled={busy} aria-label={t("workspace.use_memory", "Use this memory")} onChange={async (event) => { const enabled = event.target.checked; setBusy(true); try { await request(`memory/${item.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }); setMemories((items) => items.map((entry) => entry.id === item.id ? { ...entry, enabled } : entry)); } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); } }}/><p>{item.content}</p><WorkspaceTooltip label={t("workspace.edit_memory", "Edit memory")} side="bottom"><button className="ws-icon-btn" disabled={busy} aria-label={t("workspace.edit_memory", "Edit memory")} onClick={() => { setEditingMemory(item.id); setMemory(item.content); }}><WorkspaceIcon name="edit" size={17}/></button></WorkspaceTooltip><WorkspaceTooltip label={t("workspace.delete_memory", "Delete memory")} side="bottom"><button className="ws-icon-btn" disabled={busy} aria-label={t("workspace.delete_memory", "Delete memory")} onClick={() => setDeleteMemory(item)}><WorkspaceIcon name="trash" size={17}/></button></WorkspaceTooltip></div>) : <p className="ws-empty">{t("workspace.no_memories", "No saved memory yet")}</p>}
      <label>{t(editingMemory ? "workspace.edit_memory" : "workspace.new_memory", editingMemory ? "Edit memory" : "New memory")}<textarea className="resize-none" value={memory} maxLength={2000} rows={3} onChange={(e) => setMemory(e.target.value)}/></label><button className="ws-btn ws-btn-primary" disabled={busy || !memory.trim()} onClick={() => void addMemory()}>{t(editingMemory ? "workspace.save_changes" : "workspace.remember", editingMemory ? "Save changes" : "Remember")}</button>
    </div>}
  </WorkspaceDialog>
  {preview && <WorkspaceDialog title={preview.name} onClose={() => setPreview(null)} wide><pre className="ws-file-text">{preview.extracted_text || t("workspace.no_text", "No text preview is available")}</pre>{preview.data && <a className="ws-btn" download={preview.name} href={`data:${preview.mime_type || "application/octet-stream"};base64,${preview.data}`}><WorkspaceIcon name="download" size={16}/>{t("workspace.download", "Download original")}</a>}</WorkspaceDialog>}
  {deleteMemory && <WorkspaceDialog title={t("workspace.delete_memory", "Delete memory")} onClose={() => setDeleteMemory(null)}><p>{t("workspace.delete_memory_confirm", "Delete this saved memory? It will no longer be used in future replies.")}</p><div className="ws-form-actions"><button className="ws-btn" onClick={() => setDeleteMemory(null)}>{t("workspace.cancel", "Cancel")}</button><button className="ws-btn" disabled={busy} onClick={async () => { setBusy(true); try { await request(`memory/${deleteMemory.id}`, { method: "DELETE" }); setMemories((items) => items.filter((item) => item.id !== deleteMemory.id)); setDeleteMemory(null); } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); } }}>{t("workspace.delete", "Delete")}</button></div></WorkspaceDialog>}
  </>;
}
