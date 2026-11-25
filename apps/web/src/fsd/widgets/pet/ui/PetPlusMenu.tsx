"use client";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { workspaceRequest } from "@/features/workspace";
import { PluginLogo } from "@/shared/ui/plugin-logos";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { IMAGE_MODEL } from "../model/pet-models";
import styles from "./PetComposer.module.css";

export type PetMode = "search" | "research";
type Page = "root" | "library" | "project" | "skill" | "plugin";
type Entry = {
  id: string;
  icon: ReactNode;
  title: string;
  hint?: string;
  keywords?: string;
  submenu?: boolean;
  current?: boolean;
  busy?: boolean;
  run: () => void;
};
type Section = { id: string; label?: string; entries: Entry[]; loading?: boolean; empty?: string };
type LibraryItem = { id: number; name: string; type: "document" | "image" | "video"; url?: string; content?: string };
type Preset = { id: number; name: string; description?: string };
type Plugin = { id: string; name: string; description: string; status: string };
type Project = { id: number; name: string };

const TITLES: Record<Exclude<Page, "root">, string> = {
  library: "Library",
  project: "Projects",
  skill: "Skills",
  plugin: "Plugins",
};
const TELESCOPE =
  "M3.2 9.6 13.9 4.1l1.6 3.1-10.7 5.5-1.6-3.1Zm11.4-6 2.2-1.1 2.3 4.4-2.2 1.1-2.3-4.4ZM8.6 11.6l1.6 1.3-2.3 4.6H6.3l2.3-5.9Zm2.9.2 2.6 5.7h-1.6l-2.3-4.4 1.3-1.3Z";
export const modeIcon = (mode: PetMode, size = 18) =>
  mode === "search" ? (
    <WorkspaceIcon name="globe" size={size} />
  ) : (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d={TELESCOPE} />
    </svg>
  );
export const MODE_TITLES: Record<PetMode, string> = { search: "Web search", research: "Deep research" };

const loadPresets = () => workspaceRequest<{ items: Preset[] }>("presets").then((data) => data.items || []);
const loadProjects = () => workspaceRequest<Project[]>("projects").then((data) => (Array.isArray(data) ? data : []));
const loadLibrary = () =>
  workspaceRequest<{ items: LibraryItem[] }>("library?tab=all&sort=date").then((data) =>
    (data.items || []).filter((item) => item.type !== "video"),
  );
async function loadPlugins(): Promise<Plugin[]> {
  const token = localStorage.getItem("authToken");
  if (!token) return [];
  const response = await fetch("/api/integrations", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("Plugins could not be loaded");
  const data = (await response.json()) as { plugins?: Plugin[] };
  return (data.plugins || []).filter((plugin) => plugin.status === "connected" || plugin.status === "expired");
}

function useList<T>(load: () => Promise<T[]>, enabled: boolean) {
  const [items, setItems] = useState<T[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    load()
      .then((result) => live && setItems(result))
      .catch(() => live && setItems((current) => current ?? []));
    return () => {
      live = false;
    };
  }, [load, enabled]);
  return items;
}

export function PetPlusMenu({
  model,
  mode,
  projectId,
  presetId,
  onClose,
  onUpload,
  onAttach,
  onSketch,
  onMode,
  onModel,
  onProject,
  onSkill,
  onMention,
  onError,
}: {
  model: string;
  mode: PetMode | null;
  projectId: number | null;
  presetId: number | null;
  onClose: () => void;
  onUpload: () => void;
  onAttach: (files: File[]) => void;
  onSketch: () => void;
  onMode: (mode: PetMode | null) => void;
  onModel: (value: string) => void;
  onProject: (project: Project | null) => void;
  onSkill: (preset: Preset | null) => void;
  onMention: (name: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [page, setPage] = useState<Page>("root");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();

  const presets = useList(loadPresets, true);
  const plugins = useList(loadPlugins, true);
  const projects = useList(loadProjects, true);
  const library = useList(loadLibrary, page === "library" || Boolean(needle));

  useEffect(() => {
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [page]);
  useLayoutEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, page, query]);

  const go = (next: Page) => {
    setPage(next);
    setQuery("");
    setActive(0);
  };
  const done = (action: () => void) => {
    action();
    onClose();
  };

  async function attachLibraryItem(item: LibraryItem) {
    setBusyId(item.id);
    try {
      const full = item.content !== undefined || item.url ? item : await workspaceRequest<LibraryItem>(`library/${item.id}`);
      if (full.type === "image" && full.url) {
        const blob = await fetch(full.url).then((response) => {
          if (!response.ok) throw new Error("Image could not be loaded");
          return response.blob();
        });
        onAttach([new File([blob], full.name || "image.png", { type: blob.type || "image/png" })]);
      } else {
        const name = /\.\w+$/.test(full.name) ? full.name : `${full.name}.md`;
        onAttach([new File([full.content || ""], name, { type: "text/markdown" })]);
      }
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : "Unable to attach");
    } finally {
      setBusyId(null);
    }
  }

  const icon = (name: string) => <WorkspaceIcon name={name} size={18} />;
  const pluginEntries: Entry[] = (plugins || []).map((plugin) => ({
    id: `plugin-${plugin.id}`,
    icon: <PluginLogo id={plugin.id} size={18} />,
    title: plugin.name,
    hint: plugin.description,
    keywords: "plugin app",
    run: () => done(() => onMention(plugin.name)),
  }));
  const skillEntries: Entry[] = (presets || []).map((preset) => ({
    id: `skill-${preset.id}`,
    icon: icon("sparkles"),
    title: preset.name,
    hint: preset.description || "Skill",
    keywords: "skill",
    current: preset.id === presetId,
    run: () => done(() => onSkill(preset.id === presetId ? null : preset)),
  }));
  const projectEntries: Entry[] = (projects || []).map((project) => ({
    id: `project-${project.id}`,
    icon: icon("folder"),
    title: project.name,
    hint: "Project files and instructions apply",
    current: project.id === projectId,
    run: () => done(() => onProject(project)),
  }));
  const libraryEntries: Entry[] = (library || []).map((item) => ({
    id: `library-${item.id}`,
    icon: icon(item.type === "image" ? "image" : "file"),
    title: item.name,
    hint: item.type === "image" ? "Image" : "Document",
    busy: busyId === item.id,
    run: () => void attachLibraryItem(item),
  }));
  const activeProject = projects?.find((project) => project.id === projectId);
  const toggleMode = (next: PetMode) => done(() => onMode(mode === next ? null : next));

  let sections: Section[];
  if (page === "library")
    sections = [{ id: "library", loading: !library, empty: "Your Library is empty. Save answers or canvas documents to reuse them here.", entries: libraryEntries }];
  else if (page === "project")
    sections = [
      {
        id: "projects",
        loading: !projects,
        empty: "No projects yet. Create one from the sidebar.",
        entries: [
          { id: "project-none", icon: icon("close"), title: "No project", hint: "Chat without project context", current: !projectId, run: () => done(() => onProject(null)) },
          ...projectEntries,
        ],
      },
    ];
  else if (page === "skill")
    sections = [
      {
        id: "skills",
        loading: !presets,
        empty: "No skills yet.",
        entries: [...skillEntries, { id: "skills-manage", icon: icon("settings"), title: "Manage skills", hint: "Create and edit skills", run: () => done(() => router.push("/plugins?tab=skills")) }],
      },
    ];
  else if (page === "plugin")
    sections = [
      {
        id: "plugins",
        loading: !plugins,
        entries: [
          ...pluginEntries,
          { id: "plugins-manage", icon: icon("settings"), title: pluginEntries.length ? "Manage plugins" : "Connect a plugin", hint: "GitHub, Notion, Gmail and more", run: () => done(() => router.push("/plugins")) },
        ],
      },
    ];
  else
    sections = [
      {
        id: "add",
        entries: [
          { id: "files", icon: icon("upload"), title: "Photos & files", hint: "Upload from your device", keywords: "attach upload image pdf document", run: () => done(onUpload) },
          { id: "library", icon: icon("library"), title: "From Library", hint: "Saved documents and images", keywords: "attach saved", submenu: true, run: () => go("library") },
          { id: "sketch", icon: icon("draw"), title: "Draw", hint: "Sketch and attach it as an image", keywords: "sketch drawing", run: () => done(onSketch) },
        ],
      },
      {
        id: "research",
        entries: [
          { id: "web-search", icon: modeIcon("search"), title: "Web search", hint: "Search for current news and information", keywords: "internet browse google news online", current: mode === "search", run: () => toggleMode("search") },
          { id: "deep-research", icon: modeIcon("research"), title: "Deep research", hint: "Get a detailed report with sources", keywords: "report analysis investigate study", current: mode === "research", run: () => toggleMode("research") },
        ],
      },
      {
        id: "create",
        entries: [
          { id: "image", icon: icon("image"), title: "Create an image", hint: "Free with FLUX.2", keywords: "picture generate draw", current: model === IMAGE_MODEL, run: () => done(() => onModel(IMAGE_MODEL)) },
        ],
      },
      {
        id: "work",
        entries: [
          { id: "project", icon: icon("folder"), title: "Project", hint: activeProject ? `In ${activeProject.name}` : "Use a project's files and instructions", keywords: "work in", submenu: true, run: () => go("project") },
          { id: "plugins", icon: icon("plugins"), title: "Plugins", hint: "Use a connected app", keywords: "apps integrations", submenu: true, run: () => go("plugin") },
          { id: "skills", icon: icon("sparkles"), title: "Skills", hint: "Apply your saved instructions", keywords: "preset", submenu: true, run: () => go("skill") },
        ],
      },
      // A search also finds what lives a level down.
      ...(needle
        ? [
            { id: "found-plugins", label: "Plugins", loading: !plugins, entries: pluginEntries },
            { id: "found-skills", label: "Skills", loading: !presets, entries: skillEntries },
            { id: "found-projects", label: "Projects", loading: !projects, entries: projectEntries },
            { id: "found-library", label: "Library", loading: !library, entries: libraryEntries },
          ]
        : []),
    ];
  const matches = (entry: Entry) => !needle || `${entry.title} ${entry.hint || ""} ${entry.keywords || ""}`.toLowerCase().includes(needle);
  sections = sections.map((section) => ({ ...section, entries: section.entries.filter(matches) }));
  const entries = sections.flatMap((section) => section.entries);

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (entries.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      entries[active]?.run();
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (page !== "root") go("root");
      else onClose();
    } else if (event.key === "Backspace" && !query && page !== "root") {
      event.preventDefault();
      go("root");
    }
  }

  let index = -1;
  return (
    <div className={styles.palette}>
      <label className={styles.search}>
        <WorkspaceIcon name="search" size={15} />
        <input
          ref={search}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={keys}
          placeholder={page === "root" ? "Search" : `Search ${TITLES[page].toLowerCase()}`}
          aria-label="Search the add menu"
        />
      </label>
      {page !== "root" && (
        <button type="button" className={styles.back} onClick={() => go("root")}>
          <WorkspaceIcon name="arrow-left" size={16} />
          <span>{TITLES[page]}</span>
        </button>
      )}
      <div ref={list} key={page} className={styles.list} data-sub={page !== "root" || undefined} role="listbox" aria-label={page === "root" ? "Add to your message" : TITLES[page]}>
        {sections.map((section) =>
          section.entries.length || section.loading || section.empty ? (
            <div key={section.id} className={styles.section} role="group" aria-label={section.label}>
              {section.label && <p className={styles.label}>{section.label}</p>}
              {section.entries.map((entry) => {
                index++;
                const position = index;
                return (
                  <div
                    key={entry.id}
                    role="option"
                    aria-selected={position === active}
                    aria-current={entry.current || undefined}
                    className={styles.row}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseMove={() => position !== active && setActive(position)}
                    onClick={entry.run}
                  >
                    <span className={styles.rowIcon}>{entry.icon}</span>
                    <span className={styles.rowTitle}>{entry.title}</span>
                    {entry.hint && <span className={styles.rowHint}>{entry.hint}</span>}
                    {entry.busy ? (
                      <span className={styles.spinner} />
                    ) : entry.current ? (
                      <span className={styles.rowEnd}>
                        <WorkspaceIcon name="check" size={15} />
                      </span>
                    ) : entry.submenu ? (
                      <span className={styles.rowEnd}>
                        <WorkspaceIcon name="chevron" size={15} />
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {section.loading && !section.entries.length && (
                <div className={styles.loading} role="status" aria-label="Loading">
                  <span />
                  <span />
                </div>
              )}
              {section.empty && !section.loading && !section.entries.length && <p className={styles.empty}>{section.empty}</p>}
            </div>
          ) : null,
        )}
        {!entries.length && !sections.some((section) => section.loading || section.empty) && <p className={styles.empty}>No matches</p>}
      </div>
    </div>
  );
}
