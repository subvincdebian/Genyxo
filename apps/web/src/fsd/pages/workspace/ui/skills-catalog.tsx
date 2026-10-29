"use client";

import { useRef, useState, type FormEvent } from "react";
import { workspaceRequest, useWorkspace } from "@/features/workspace";
import { WorkspaceDialog, WorkspaceIcon, WorkspaceMenu, WorkspaceTooltip } from "@/shared/ui/workspace";
import { CatalogHeader, ConfirmDelete, Field, Form, FormFooter, jsonBody, ResourceState, Search, tabKeys, useAction, useLabels, usePageQuery, useResource } from "./page-tools";

type Preset = { id: number; name: string; description: string; instructions: string; version: number; isPublic?: boolean; model?: string };

export function SkillsCatalog({ onTab }: { onTab: (tab: "plugins" | "skills") => void }) {
  const l = useLabels(); const workspace = useWorkspace(); const [query, setQuery] = usePageQuery();
  const personal = query.get("scope") === "personal";
  const [search, setSearch] = useState("");
  const presets = useResource<{ items: Preset[] }>("presets");
  const [presetEditor, setPresetEditor] = useState<Preset | "new" | null>(null);
  const [presetMenu, setPresetMenu] = useState<{ preset: Preset; x: number; y: number } | null>(null);
  const [deleting, setDeleting] = useState<Preset | null>(null);
  const [apply, setApply] = useState<Preset | null>(null); const strip = useRef<HTMLDivElement>(null);
  const action = useAction();
  const mutate = async (path: string, init?: RequestInit) => { const result = await workspaceRequest(path, init); presets.reload(); return result; };
  const needle = search.toLocaleLowerCase();
  const saved = (presets.data?.items || []).filter((preset) => !preset.isPublic);
  const visible = (presets.data?.items || []).filter((preset) => (personal ? !preset.isPublic : preset.isPublic) && `${preset.name} ${preset.description}`.toLocaleLowerCase().includes(needle));
  const applyPreset = async (preset: Preset, target: string) => {
    if (await action.run(async () => {
      if (target.startsWith("project:")) {
        const projectId = Number(target.slice(8)); await workspaceRequest(`projects/${projectId}`, jsonBody({ presetId: preset.id }, "PATCH"));
        await workspace.refresh(); workspace.startNewChat(projectId);
      } else if (target === "current" && workspace.selectedChatId) {
        await workspaceRequest(`conversations/${workspace.selectedChatId}/preset`, jsonBody({ presetId: preset.id })); workspace.selectChat(workspace.selectedChatId);
      } else workspace.startNewChat();
      document.dispatchEvent(new CustomEvent("genyxo:workspace-preset", { detail: { presetId: preset.id, name: preset.name } }));
    })) setApply(null);
  };
  return <section className="wp-page wp-plugins" aria-label={l("pluginsAndSkills", "Plugins and skills")}>
    <CatalogHeader skills onTab={onTab}><button className="wp-primary" aria-label={l("add", "Add")} onClick={() => setPresetEditor("new")}><WorkspaceIcon name="plus" size={16} />{l("add", "Add")}</button></CatalogHeader>
    <Search value={search} onChange={setSearch} label={l("searchSkills", "Search skills")} />
    <div className="wp-installed"><div className="wp-section-heading"><button onClick={() => setQuery({ scope: "personal" })}>{l("savedSkills", "Saved skills")} <WorkspaceIcon name="chevron" size={14}/></button><div className="wp-strip-controls"><WorkspaceTooltip label={l("scrollLeft", "Scroll left")} side="bottom"><button aria-label={l("scrollLeft", "Scroll left")} onClick={() => strip.current?.scrollBy({ left: -240, behavior: "smooth" })}><WorkspaceIcon name="arrow-left" size={18}/></button></WorkspaceTooltip><WorkspaceTooltip label={l("scrollRight", "Scroll right")} side="bottom"><button aria-label={l("scrollRight", "Scroll right")} onClick={() => strip.current?.scrollBy({ left: 240, behavior: "smooth" })}><WorkspaceIcon name="arrow-right" size={18}/></button></WorkspaceTooltip></div></div><div className="wp-installed-strip" ref={strip} tabIndex={0} aria-label={l("savedSkills", "Saved skills")}>
      {saved.map((preset) => <button className="wp-installed-item" key={preset.id} onClick={() => setApply(preset)}><span className="wp-app-icon"><WorkspaceIcon name="sparkles" size={25} /></span><span>{preset.name}</span></button>)}
      {!presets.loading && !saved.length && <p className="wp-muted">{l("noSavedSkills", "Save a skill to keep your instructions close.")}</p>}
    </div></div>
    <div className="wp-tabs wp-scope-tabs" role="tablist" onKeyDown={tabKeys} aria-label={l("catalogScope", "Catalog scope")}><button role="tab" aria-selected={!personal} onClick={() => setQuery({ scope: "public" })}>{l("public", "Public")}</button><button role="tab" aria-selected={personal} onClick={() => setQuery({ scope: "personal" })}>{l("personal", "Personal")}</button></div>
    <div className="wp-section-heading"><h1>{personal ? l("yourCollection", "Your collection") : l("popular", "Popular")}</h1></div>
    {action.error && <p className="wp-error" role="alert">{action.error}</p>}
    <div className="wp-plugin-grid" aria-busy={presets.loading}><ResourceState icon={search ? "search" : "sparkles"} loading={presets.loading} error={presets.error} retry={presets.reload} empty={!visible.length} emptyTitle={search ? l("noResults", "No results found") : l("empty", "Nothing here yet")} emptyText={l("skillsEmptyHint", "Add a skill or copy a public template into your collection.")} />
      {!presets.loading && !presets.error && visible.map((preset) => <article className="wp-plugin-card" key={preset.id}><span className="wp-app-icon"><WorkspaceIcon name="sparkles" size={28} /></span><div className="wp-plugin-copy"><h2>{preset.name}</h2><p>{preset.description}</p><small>{l("version", "Version")} {preset.version}{preset.model ? ` · ${preset.model}` : ""}</small></div><div className="wp-card-actions"><WorkspaceTooltip label={`${l("use", "Use")} ${preset.name}`} side="bottom"><button className="wp-icon-button" aria-label={`${l("use", "Use")} ${preset.name}`} onClick={() => setApply(preset)}><WorkspaceIcon name="arrow-right" size={19} /></button></WorkspaceTooltip><WorkspaceTooltip label={`${l("itemActions", "Actions for")} ${preset.name}`} side="bottom"><button className="wp-icon-button" aria-label={`${l("itemActions", "Actions for")} ${preset.name}`} onClick={(event) => setPresetMenu({ preset, x: event.clientX, y: event.clientY })}><WorkspaceIcon name="more" /></button></WorkspaceTooltip></div></article>)}
    </div>
    {presetMenu && <WorkspaceMenu anchor={presetMenu} onClose={() => setPresetMenu(null)}>{!presetMenu.preset.isPublic && <button role="menuitem" onClick={() => { setPresetEditor(presetMenu.preset); setPresetMenu(null); }}>{l("edit", "Edit")}</button>}<button role="menuitem" onClick={() => { const preset = presetMenu.preset; setPresetMenu(null); void action.run(async () => { await mutate("presets", jsonBody({ name: `${preset.name} ${l("copySuffix", "copy")}`, description: preset.description, instructions: preset.instructions, model: preset.model, isPublic: false })); setQuery({ scope: "personal" }); }); }}>{l("duplicate", "Duplicate")}</button>{!presetMenu.preset.isPublic && <button role="menuitem" className="ws-danger" onClick={() => { setDeleting(presetMenu.preset); setPresetMenu(null); }}>{l("delete", "Delete")}</button>}</WorkspaceMenu>}
    {presetEditor && <PresetEditor preset={presetEditor === "new" ? null : presetEditor} onClose={() => setPresetEditor(null)} onSave={async (body) => { await mutate(`presets${presetEditor === "new" ? "" : `/${presetEditor.id}`}`, jsonBody(body, presetEditor === "new" ? "POST" : "PATCH")); setQuery({ scope: "personal" }); }} />}
    {deleting && <ConfirmDelete name={deleting.name} onClose={() => setDeleting(null)} onDelete={() => mutate(`presets/${deleting.id}`, { method: "DELETE" })} />}
    {apply && <ApplyDialog preset={apply} busy={action.busy} error={action.error} onClose={() => setApply(null)} onApply={(target) => void applyPreset(apply, target)} />}
  </section>;
}

function PresetEditor({ preset, onClose, onSave }: { preset: Preset | null; onClose: () => void; onSave: (body: unknown) => Promise<unknown> }) {
  const l = useLabels(); const action = useAction(onClose); const [name, setName] = useState(preset?.name || ""); const [description, setDescription] = useState(preset?.description || ""); const [instructions, setInstructions] = useState(preset?.instructions || ""); const [model, setModel] = useState(preset?.model || "");
  const submit = (event: FormEvent) => { event.preventDefault(); if (name.trim() && instructions.trim()) void action.run(() => onSave({ name: name.trim(), description: description.trim(), instructions: instructions.trim(), model: model.trim() || null, isPublic: false })); };
  return <WorkspaceDialog title={preset ? l("editSkill", "Edit skill") : l("newSkill", "New skill")} onClose={onClose} wide><Form noValidate className="wp-form" onSubmit={submit}><Field label={l("name", "Name")}><input autoFocus required value={name} maxLength={200} onChange={(event) => setName(event.target.value)} /></Field><Field label={l("description", "Description")}><input value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} /></Field><Field label={l("instructions", "Instructions")}><textarea className="resize-none" required rows={9} maxLength={30000} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></Field><Field label={l("optionalModel", "Model (optional)")}><input value={model} placeholder="openai/gpt-4o-mini" onChange={(event) => setModel(event.target.value)} /></Field><p className="wp-muted">{l("skillVersionHint", "Changes create a new version. Apply it explicitly to update an existing conversation.")}</p><FormFooter {...action} onClose={onClose} /></Form></WorkspaceDialog>;
}
function ApplyDialog({ preset, busy, error, onClose, onApply }: { preset: Preset; busy: boolean; error: string; onClose: () => void; onApply: (target: string) => void }) {
  const l = useLabels(); const workspace = useWorkspace(); const [target, setTarget] = useState(workspace.selectedChatId ? "current" : "new");
  return <WorkspaceDialog title={`${l("use", "Use")} ${preset.name}`} onClose={onClose}><Form noValidate className="wp-form" onSubmit={(event) => { event.preventDefault(); onApply(target); }}><p>{l("applyHint", "Choose where to apply these instructions. No message will be sent.")}</p><Field label={l("applyTo", "Apply to")}><select value={target} onChange={(event) => setTarget(event.target.value)}>{workspace.selectedChatId && <option value="current">{l("currentChat", "Current chat")}</option>}<option value="new">{l("newChat", "New chat")}</option>{workspace.projects.map((project) => <option value={`project:${project.id}`} key={project.id}>{project.name}</option>)}</select></Field>{error && <p role="alert" className="wp-error">{error}</p>}<div className="wp-form-actions"><button type="button" onClick={onClose}>{l("cancel", "Cancel")}</button><button className="wp-primary" disabled={busy} type="submit">{l("apply", "Apply")}</button></div></Form></WorkspaceDialog>;
}
