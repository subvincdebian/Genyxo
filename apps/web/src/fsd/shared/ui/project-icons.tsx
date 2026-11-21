"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { WorkspaceMenu } from "./workspace";

/**
 * Project glyphs and tints, drawn on a 24px grid with a 1.6 stroke. The names
 * match the API's allow-list (backend chat/project-appearance.ts).
 */
const ICONS: Record<string, { keywords: string; node: ReactNode }> = {
  folder: { keywords: "folder files default", node: <path d="M3.5 7.5a2 2 0 0 1 2-2h3.8l2 2.2h7.2a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /> },
  dollar: { keywords: "money finance budget dollar", node: <><circle cx="12" cy="12" r="8.5" /><path d="M14.6 9.3c-.4-1-1.4-1.6-2.6-1.6-1.5 0-2.6.8-2.6 2s1 1.7 2.6 2.1 2.7 1 2.7 2.3-1.2 2.1-2.7 2.1c-1.3 0-2.3-.6-2.8-1.7M12 6.2v1.5M12 16.4v1.4" /></> },
  book: { keywords: "book read study notes", node: <path d="M5 5.5a2 2 0 0 1 2-2h11v15H7a2 2 0 0 0-2 2zm0 15v-15m13 13v2H7" /> },
  cap: { keywords: "school education learn graduation", node: <path d="M2.5 9 12 4.5 21.5 9 12 13.5zm4 2v4.5c1.5 1.5 3.4 2.2 5.5 2.2s4-.7 5.5-2.2V11m4-2v5" /> },
  pencil: { keywords: "pencil edit write draft", node: <path d="m15.5 4.5 4 4-11 11-4.8.8.8-4.8zm-2 2 4 4" /> },
  pen: { keywords: "pen write sign design", node: <path d="M12 20.5h8.5M4 16.8 15.6 5.2a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L7.2 20H4z" /> },
  code: { keywords: "code develop programming json", node: <path d="M8.5 4.5c-2 0-2.5 1-2.5 2.5v2.5c0 1.3-.8 2.5-2 2.5 1.2 0 2 1.2 2 2.5V17c0 1.5.5 2.5 2.5 2.5m7-15c2 0 2.5 1 2.5 2.5v2.5c0 1.3.8 2.5 2 2.5-1.2 0-2 1.2-2 2.5V17c0 1.5-.5 2.5-2.5 2.5" /> },
  terminal: { keywords: "terminal console shell command", node: <path d="M3.5 6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2zm4 3.5 3 2.5-3 2.5m5 .5h4" /> },
  music: { keywords: "music song audio sound", node: <path d="M9 17.5v-12l11-2v12m-11-6 11-2M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm11-2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" /> },
  palette: { keywords: "art design paint colour color", node: <><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.8-1.7h2.2a3.9 3.9 0 0 0 3.9-3.9c0-3.8-3.8-6.9-8.5-6.9z" /><circle cx="7.6" cy="11.5" r=".9" /><circle cx="10" cy="7.6" r=".9" /><circle cx="14.8" cy="7.8" r=".9" /></> },
  chart: { keywords: "chart stats analytics data", node: <path d="M4 20.5h16M7 20.5v-6m4.5 6v-11m4.5 11v-8M20 20.5v-15" /> },
  briefcase: { keywords: "work job business office", node: <path d="M4 8.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm5-2V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5m-11 6h16" /> },
  camera: { keywords: "camera photo picture video", node: <><path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.4" /></> },
  gift: { keywords: "gift present birthday party", node: <path d="M4 10.5h16v3H4zm1.5 3v6h13v-6M12 10.5v9m0-9c-1-2.5-4.5-3.5-4.5-1.3 0 1.3 2.5 1.3 4.5 1.3zm0 0c1-2.5 4.5-3.5 4.5-1.3 0 1.3-2.5 1.3-4.5 1.3z" /> },
  dumbbell: { keywords: "fitness gym sport health workout", node: <path d="M6.5 7.5v9m11-9v9M4 10v4m16-4v4M6.5 12h11" /> },
  scale: { keywords: "law legal balance justice", node: <path d="M12 4v16m-4 0h8M5 7.5h14m-12 0-3 6a3 3 0 0 0 6 0zm10 0-3 6a3 3 0 0 0 6 0z" /> },
  bulb: { keywords: "idea light bulb think", node: <path d="M9 18.5h6M10 21h4M12 3.5a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5v-.5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3.5z" /> },
  globe: { keywords: "globe world travel web language", node: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5z" /></> },
  send: { keywords: "send plane trip travel message", node: <path d="m3 11.5 17.5-8-6 17-3.2-6.3zm8.3 2.7 9.2-10.7" /> },
  wrench: { keywords: "tools fix repair settings", node: <path d="M14.5 4a4.5 4.5 0 0 0-4.2 6.1L4 16.4 7.6 20l6.3-6.3A4.5 4.5 0 0 0 20 9.5l-2.8 2.8-2.9-.6-.6-2.9L16.5 6a4.5 4.5 0 0 0-2-2z" /> },
  paw: { keywords: "pet animal dog cat paw", node: <><path d="M12 13c-2.5 0-4.5 2.4-4.5 4.3 0 1.3 1 2.2 2.3 2.2.9 0 1.4-.4 2.2-.4s1.3.4 2.2.4c1.3 0 2.3-.9 2.3-2.2 0-1.9-2-4.3-4.5-4.3z" /><circle cx="6.3" cy="10.6" r="1.6" /><circle cx="9.6" cy="6.6" r="1.6" /><circle cx="14.4" cy="6.6" r="1.6" /><circle cx="17.7" cy="10.6" r="1.6" /></> },
  flask: { keywords: "science lab research chemistry", node: <path d="M9.5 3.5h5m-4 0v6L5 18.5a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5.5-9v-6m-6 11h9" /> },
  heart: { keywords: "heart love health favourite", node: <path d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 6.8a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10-7.5 10z" /> },
  star: { keywords: "star favourite important", node: <path d="m12 3.8 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /> },
  sparkles: { keywords: "ai magic sparkles ideas", node: <path d="m12 3.5 1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4L6 9.5l4.4-1.6zm6 11.5.8 2.2 2.2.8-2.2.8L18 21l-.8-2.2-2.2-.8 2.2-.8z" /> },
  home: { keywords: "home house family personal", node: <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4V15h-5v5.5h-4A1.5 1.5 0 0 1 4 19z" /> },
  leaf: { keywords: "nature plant garden eco", node: <path d="M5 19.5c0-8 5-14 15-14 0 10-6 15-14 15m-1-1c3-4 6-6.5 9.5-8.5" /> },
};

export const PROJECT_ICON_NAMES = Object.keys(ICONS);

export const PROJECT_COLORS: { name: string | null; value: string; label: string }[] = [
  { name: null, value: "currentColor", label: "Default" },
  { name: "red", value: "#f87171", label: "Red" },
  { name: "orange", value: "#fb923c", label: "Orange" },
  { name: "yellow", value: "#facc15", label: "Yellow" },
  { name: "green", value: "#4ade80", label: "Green" },
  { name: "blue", value: "#60a5fa", label: "Blue" },
  { name: "purple", value: "#c084fc", label: "Purple" },
  { name: "pink", value: "#f472b6", label: "Pink" },
];

const tint = (color?: string | null) => PROJECT_COLORS.find((item) => item.name === color)?.value;

/** A project's glyph in its colour; unknown or empty values draw the folder. */
export function ProjectGlyph({ icon, color, size = 18 }: { icon?: string | null; color?: string | null; size?: number }) {
  const glyph = ICONS[icon || ""] || ICONS.folder;
  return <svg className="ws-project-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={tint(color) ? { color: tint(color) } : undefined}>{glyph.node}</svg>;
}

/**
 * The icon button in the project name field and its glass picker: search,
 * a colour row and the glyph grid, as in ChatGPT's project dialog.
 */
export function ProjectIconPicker({ icon, color, onChange, label, searchLabel, clearLabel, disabled = false }: {
  icon: string | null;
  color: string | null;
  onChange: (next: { icon: string | null; color: string | null }) => void;
  label: string;
  searchLabel: string;
  clearLabel: string;
  disabled?: boolean;
}) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const open = Boolean(trigger);
  const needle = query.trim().toLowerCase();
  const names = PROJECT_ICON_NAMES.filter((name) => !needle || name.includes(needle) || ICONS[name].keywords.includes(needle));
  useEffect(() => {
    // After WorkspaceMenu focuses its first button, start in the search field.
    if (open) requestAnimationFrame(() => search.current?.focus());
  }, [open]);
  return <>
    <button type="button" className="ws-project-icon-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={(event) => setTrigger(open ? null : event.currentTarget)}>
      <ProjectGlyph icon={icon} color={color} size={18} />
    </button>
    {open && <WorkspaceMenu trigger={trigger} placement="auto" className="ws-project-icon-picker" onClose={() => { setTrigger(null); setQuery(""); }}>
      <div className="ws-project-icon-search">
        <input ref={search} value={query} placeholder={searchLabel} aria-label={searchLabel} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key !== "Escape") event.stopPropagation(); }} />
        {(icon || color || query) && <button type="button" onClick={() => { setQuery(""); onChange({ icon: null, color: null }); }}>{clearLabel}</button>}
      </div>
      <div className="ws-project-colors" role="radiogroup" aria-label="Colour">
        {PROJECT_COLORS.map((item) => <button key={item.label} type="button" role="radio" aria-checked={color === item.name} aria-label={item.label} className="ws-project-color" style={{ "--swatch": item.name ? item.value : "#eceeed" } as CSSProperties} onClick={() => onChange({ icon, color: item.name })} />)}
      </div>
      <div className="ws-project-icons" role="radiogroup" aria-label={label}>
        {names.map((name) => <button key={name} type="button" role="radio" aria-checked={(icon || "folder") === name} aria-label={name} className="ws-project-icon-option" onClick={() => onChange({ icon: name === "folder" ? null : name, color })}>
          <ProjectGlyph icon={name} color={color} size={20} />
        </button>)}
      </div>
    </WorkspaceMenu>}
  </>;
}
