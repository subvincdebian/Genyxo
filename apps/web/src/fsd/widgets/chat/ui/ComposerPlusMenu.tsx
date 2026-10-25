"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWorkspace, workspaceRequest } from "@/features/workspace";
import { WorkspaceIcon, WorkspaceMenu, WorkspaceSubmenu } from "@/shared/ui/workspace";
import { SketchDialog } from "./SketchDialog";

type LibraryItem = { id: number; name: string; type: "document" | "image" | "video"; url?: string; content?: string };
type Preset = { id: number; name: string; description?: string };
type Action = { id: string; section: string; icon: string; title: string; hint: string; run: () => void; hidden?: boolean };

const ACCEPT = "image/*,.pdf,.docx,.txt,.md,.csv,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.java,.cs,.go,.rs,.php,.rb,.swift,.kt,.sql,.sh,.yaml,.yml,text/*";

/** Hands files to the chat controller's existing attachment pipeline. */
function attachFiles(files: File[]) {
  const input = document.getElementById("fileInput") as HTMLInputElement | null;
  if (!input || !files.length) return;
  const transfer = new DataTransfer();
  files.forEach((file) => transfer.items.add(file));
  input.files = transfer.files;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  (document.getElementById("userInput") as HTMLTextAreaElement | null)?.focus();
}

function switchModel(value: string, placeholder: string) {
  const select = document.getElementById("modelSelect") as HTMLSelectElement | null;
  if (select) { select.value = value; select.dispatchEvent(new Event("change")); }
  const input = document.getElementById("userInput") as HTMLTextAreaElement | null;
  if (input) { input.placeholder = placeholder; input.focus(); }
}

const notify = (message: string, type = "info") => document.dispatchEvent(new CustomEvent("genyxo:workspace-notify", { detail: { message, type } }));

function row(key: string | number, icon: ReactNode, title: string, hint: string, onClick: () => void, extra?: ReactNode, current = false) {
  return <button key={key} type="button" role="menuitem" className="gx-plus-item" aria-current={current ? "true" : undefined} onClick={onClick}>
    <span className="gx-plus-icon">{icon}</span>
    <span className="gx-plus-copy"><strong>{title}</strong><small>{hint}</small></span>
    {extra}
  </button>;
}
const loading = <div className="gx-plus-loading" role="status" aria-label="Loading">{[0, 1, 2].map((index) => <span key={index} />)}</div>;
const tile = (name: string) => <span className="gx-plus-icon"><WorkspaceIcon name={name} size={18} /></span>;

// Submenu bodies mount when their flyout opens, so data loads on first hover.
function useResource<T>(path: string) {
  const [state, setState] = useState<{ items: T[] | null; error: string }>({ items: null, error: "" });
  useEffect(() => {
    let active = true;
    workspaceRequest<{ items: T[] }>(path).then((data) => { if (active) setState({ items: data.items || [], error: "" }); }).catch((error: Error) => { if (active) setState({ items: [], error: error.message }); });
    return () => { active = false; };
  }, [path]);
  return state;
}

function LibraryList({ onPick, busyId }: { onPick: (item: LibraryItem) => void; busyId: number | null }) {
  const { items, error } = useResource<LibraryItem>("library?tab=all&sort=date");
  if (!items) return loading;
  const usable = items.filter((item) => item.type !== "video");
  if (!usable.length) return <p className="gx-plus-empty">{error || "Your Library is empty. Save answers or canvas documents to reuse them here."}</p>;
  return <>{usable.map((item) => row(item.id, <WorkspaceIcon name={item.type === "image" ? "image" : "file"} size={18} />, item.name, item.type === "image" ? "Image" : "Document", () => onPick(item), busyId === item.id ? <span className="gx-plus-spinner" /> : undefined))}</>;
}

function SkillList({ onPick }: { onPick: (preset: Preset) => void }) {
  const { items, error } = useResource<Preset>("presets");
  if (!items) return loading;
  if (!items.length) return <p className="gx-plus-empty">{error || "No skills yet. Add one on the Plugins page."}</p>;
  return <>{items.map((preset) => row(preset.id, <WorkspaceIcon name="sparkles" size={18} />, preset.name, preset.description || "Saved skill", () => onPick(preset)))}</>;
}

export function ComposerPlusMenu({ disabled }: { disabled: boolean }) {
  const { projects, activeProjectId, setActiveProjectId } = useWorkspace();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const open = Boolean(anchor);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sketch, setSketch] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => { queueMicrotask(() => setCoarse(matchMedia("(pointer: coarse)").matches)); }, []);
  const close = () => { setAnchor(null); setQuery(""); };
  // Command-palette feel on desktop: typing filters at once. Phones keep the keyboard closed.
  useEffect(() => {
    if (!open || coarse) return;
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, coarse]);

  const activeProject = projects.find((project) => project.id === activeProjectId);
  const actions: Action[] = [
    { id: "files", section: "Add", icon: "upload", title: "Photos & files", hint: "Upload from your device", run: () => { document.getElementById("gxPlusFiles")?.click(); close(); } },
    { id: "camera", section: "Add", icon: "camera", title: "Take a photo", hint: "Use your camera", run: () => { document.getElementById("gxPlusCamera")?.click(); close(); }, hidden: !coarse },
    { id: "sketch", section: "Add", icon: "draw", title: "Draw a sketch", hint: "Sketch and attach it as an image", run: () => { setSketch(true); close(); } },
    { id: "image", section: "Create", icon: "image", title: "Create an image", hint: "Switch to DALL·E 3", run: () => { switchModel("openai/dall-e-3", "Describe the image you want…"); close(); } },
    { id: "video", section: "Create", icon: "video", title: "Make a video", hint: "Switch to Kling video", run: () => { switchModel("kling-video", "Describe the video you want…"); close(); } },
    { id: "canvas", section: "Create", icon: "canvas", title: "New canvas", hint: "Write or code side by side", run: () => { document.dispatchEvent(new CustomEvent("genyxo:canvas-open", { detail: { content: "# Untitled\n\nStart writing here.\n", language: "markdown", title: "Untitled document" } })); close(); } },
  ];

  const attachLibraryItem = async (item: LibraryItem) => {
    setBusyId(item.id);
    try {
      const full = item.content !== undefined || item.url ? item : await workspaceRequest<LibraryItem>(`library/${item.id}`);
      if (full.type === "image" && full.url) {
        const blob = await fetch(full.url).then((response) => { if (!response.ok) throw new Error("Image could not be loaded"); return response.blob(); });
        attachFiles([new File([blob], full.name || "image.png", { type: blob.type || "image/png" })]);
      } else {
        const name = /\.\w+$/.test(full.name) ? full.name : `${full.name}.md`;
        attachFiles([new File([full.content || ""], name, { type: "text/markdown" })]);
      }
      close();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to attach", "error");
    } finally {
      setBusyId(null);
    }
  };
  const chooseProject = (id: number | null) => { setActiveProjectId(id); notify(id ? `Working in ${projects.find((project) => project.id === id)?.name}` : "Project cleared"); close(); };
  const choosePreset = (preset: Preset) => { document.dispatchEvent(new CustomEvent("genyxo:workspace-preset", { detail: { presetId: preset.id, name: preset.name } })); close(); };

  const needle = query.trim().toLowerCase();
  const matches = (text: string) => !needle || text.toLowerCase().includes(needle);
  const visibleActions = actions.filter((action) => !action.hidden && (matches(action.title) || matches(action.hint)));
  const sections = [...new Set(visibleActions.map((action) => action.section))];
  const showLibrary = matches("from library attach saved document image");
  const showProject = matches("project work in files instructions") || projects.some((project) => matches(project.name));
  const showSkill = matches("skill apply saved");

  return <>
    <button type="button" className="plus-btn" id="plusBtn" disabled={disabled} aria-label="Add files and more" aria-haspopup="menu" aria-expanded={open} onClick={(event) => (open ? close() : setAnchor(event.currentTarget))}>
      <WorkspaceIcon name="plus" />
    </button>
    <input id="gxPlusFiles" type="file" multiple hidden accept={ACCEPT} onChange={(event) => { attachFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    <input id="gxPlusCamera" type="file" hidden accept="image/*" capture="environment" onChange={(event) => { attachFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
    {open && <WorkspaceMenu trigger={anchor} positionTarget={anchor?.closest("form")} placement="auto" className="gx-plus-menu" onClose={close}>
      <div className="gx-plus-body" onKeyDown={(event) => {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && document.activeElement !== search.current) search.current?.focus();
      }}>
        <label className="gx-plus-search"><WorkspaceIcon name="search" size={15} /><input ref={search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actions, projects, skills" aria-label="Search the add menu" /></label>
        <div className="gx-plus-scroll">
          {sections.includes("Add") || showLibrary ? <div className="gx-plus-section">
            <p className="gx-plus-label">Add</p>
            {visibleActions.filter((action) => action.section === "Add" && action.id !== "sketch").map((action) => row(action.id, <WorkspaceIcon name={action.icon} size={18} />, action.title, action.hint, action.run))}
            {showLibrary && <WorkspaceSubmenu className="gx-plus-item" iconNode={tile("library")} label={<strong>From Library</strong>} hint="Attach a saved document or image">
              <LibraryList onPick={(item) => void attachLibraryItem(item)} busyId={busyId} />
            </WorkspaceSubmenu>}
            {visibleActions.filter((action) => action.id === "sketch").map((action) => row(action.id, <WorkspaceIcon name={action.icon} size={18} />, action.title, action.hint, action.run))}
          </div> : null}
          {sections.includes("Create") && <div className="gx-plus-section">
            <p className="gx-plus-label">Create</p>
            {visibleActions.filter((action) => action.section === "Create").map((action) => row(action.id, <WorkspaceIcon name={action.icon} size={18} />, action.title, action.hint, action.run))}
          </div>}
          {(showProject || showSkill) && <div className="gx-plus-section">
            <p className="gx-plus-label">Work in</p>
            {showProject && <WorkspaceSubmenu className="gx-plus-item" iconNode={tile("folder")} label={<strong>{activeProject ? activeProject.name : "Project"}</strong>} hint={activeProject ? "Current project · change" : "Use a project's files and instructions"}>
              {row("none", <WorkspaceIcon name="close" size={16} />, "No project", "Chat without project context", () => chooseProject(null), !activeProjectId ? <WorkspaceIcon name="check" size={15} /> : undefined, !activeProjectId)}
              {projects.map((project) => row(project.id, <WorkspaceIcon name="folder" size={18} />, project.name, "Project files and instructions apply", () => chooseProject(project.id), project.id === activeProjectId ? <WorkspaceIcon name="check" size={15} /> : undefined, project.id === activeProjectId))}
              {!projects.length && <p className="gx-plus-empty">No projects yet. Create one from the sidebar.</p>}
            </WorkspaceSubmenu>}
            {showSkill && <WorkspaceSubmenu className="gx-plus-item" iconNode={tile("sparkles")} label={<strong>Skill</strong>} hint="Apply one of your saved skills">
              <SkillList onPick={choosePreset} />
            </WorkspaceSubmenu>}
          </div>}
          {needle && !visibleActions.length && !showLibrary && !showProject && !showSkill && <p className="gx-plus-empty">No matching actions</p>}
        </div>
      </div>
    </WorkspaceMenu>}
    {sketch && <SketchDialog onClose={() => setSketch(false)} onAttach={(file) => { attachFiles([file]); setSketch(false); }} />}
  </>;
}
