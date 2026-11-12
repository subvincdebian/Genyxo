"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createTask, describeTask, loadSavedPlaces, openTask, useWorkspace, workspaceRequest, type ScheduledTask, type TaskStatus } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import { useLabels } from "./page-tools";

type Recipe = { id: string; icon: ReactNode; title: string; hint: string; prompt: string; repeat: ScheduledTask["schedule"]["repeat"]; time: string; weekday?: number; location?: boolean };
const glyph = (path: string) => <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
const RECIPES: Recipe[] = [
  { id: "morning", icon: glyph("M10 3v1.5M4.3 5.3l1 1M15.7 5.3l-1 1M3 11h1.5M15.5 11H17M6.5 11a3.5 3.5 0 0 1 7 0M3 15h14"), title: "Morning briefing", hint: "Weather, the drive to work and local news every morning", repeat: "weekdays", time: "08:00", location: true, prompt: "Give me a short morning briefing for my area: today's weather (call genyxo_weather), the usual drive or transit time to @Work if I saved it, and the 3 most important local news with sources. Keep it brief and friendly." },
  { id: "news", icon: glyph("M4 4.5h9.5v11H5.5A1.5 1.5 0 0 1 4 14V4.5ZM13.5 7.5H16V14a1.5 1.5 0 0 1-1.5 1.5M6.5 7.5h4.5M6.5 10h4.5M6.5 12.5h3"), title: "Evening news digest", hint: "The day's top headlines with sources", repeat: "daily", time: "19:00", prompt: "Search the web and give me the 5 most important news stories of the day, one or two sentences each, with sources." },
  { id: "weekend", icon: glyph("M5 3.5v2M15 3.5v2M3.5 7.5h13M4.5 5h11a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM7 11h2M11 11h2M7 14h2"), title: "Weekend ideas", hint: "Events and places near you every Friday", repeat: "weekly", weekday: 5, time: "17:00", location: true, prompt: "Suggest 5 ideas for this weekend near me: events, places to visit and somewhere good to eat, with the weather forecast. Use the map and web search, and include sources." },
  { id: "tech", icon: glyph("M7 3.5h6M10 3.5V6M5.5 6h9a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM8 10h.01M12 10h.01M8 13h4"), title: "Weekly AI roundup", hint: "What happened in AI and tech this week", repeat: "weekly", weekday: 1, time: "09:00", prompt: "Search the web and summarise the most important AI and tech news of the past week: models, products and research, with sources." },
];
const FILTERS: { id: TaskStatus; label: string }[] = [{ id: "active", label: "Active" }, { id: "paused", label: "Paused" }, { id: "completed", label: "Completed" }];
const pad = (value: number) => String(value).padStart(2, "0");
/** The next date with this weekday (0 = Sunday), today included. */
const nextWeekday = (weekday: number) => { const date = new Date(); date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7)); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const position = () => new Promise<{ lat: number; lng: number } | null>((resolve) => {
  if (!navigator.geolocation) return resolve(null);
  navigator.geolocation.getCurrentPosition((found) => resolve({ lat: found.coords.latitude, lng: found.coords.longitude }), () => resolve(null), { timeout: 8000, maximumAge: 600_000 });
});

/**
 * Scheduled, as in ChatGPT: describe a task in your own words (the model sets
 * it up in a new chat), start from a recommendation, and see your tasks by state.
 */
export function WorkspaceScheduledPage() {
  const l = useLabels();
  const workspace = useWorkspace();
  const [tasks, setTasks] = useState<ScheduledTask[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<TaskStatus>("active");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showRecipes, setShowRecipes] = useState(true);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState("");
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => workspaceRequest<{ items: ScheduledTask[] }>("scheduled").then((data) => { setTasks(data.items || []); setError(""); }, (caught) => { setTasks((current) => current ?? []); setError(caught.message); });
    void load();
    document.addEventListener("genyxo:task-updated", load);
    document.addEventListener("genyxo:generation-finished", load);
    return () => { document.removeEventListener("genyxo:task-updated", load); document.removeEventListener("genyxo:generation-finished", load); };
  }, []);
  useEffect(() => {
    if (!filterOpen) return;
    const outside = (event: PointerEvent) => { if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setFilterOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); };
  }, [filterOpen]);

  const describe = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    workspace.startNewChat();
    requestAnimationFrame(() => document.dispatchEvent(new CustomEvent("genyxo:composer-draft", { detail: { text, send: true } })));
  };
  const add = async (recipe: Recipe) => {
    setAdding(recipe.id);
    setError("");
    try {
      const [location, places] = await Promise.all([recipe.location ? position() : null, loadSavedPlaces().catch(() => [])]);
      const date = recipe.weekday !== undefined ? nextWeekday(recipe.weekday) : undefined;
      const task = await createTask({
        title: recipe.title, prompt: recipe.prompt, repeat: recipe.repeat, time: recipe.time, date, location,
        places: places.slice(0, 6).map((place) => ({ name: place.label, lat: place.lat, lng: place.lng, address: place.address })),
      });
      openTask(task.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't add the task"); }
    finally { setAdding(""); }
  };

  const shown = (tasks || []).filter((task) => task.status === filter);
  const taken = new Set((tasks || []).map((task) => task.title));
  const recipes = RECIPES.filter((recipe) => !taken.has(recipe.title));
  return <section className="wp-page gx-sched" aria-labelledby="scheduled-title">
    <header className="gx-sched-head">
      <div>
        <h1 id="scheduled-title">{l("scheduled", "Scheduled")}</h1>
        <p>{l("scheduledLead", "Ask Genyxo to schedule tasks, set reminders or track updates")}</p>
      </div>
      <div className="gx-sched-filter" ref={filterRef}>
        <button type="button" aria-haspopup="listbox" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 4.5h13l-5 6v5l-3-1.5v-3.5l-5-6Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          {FILTERS.find((item) => item.id === filter)!.label}
        </button>
        {filterOpen && <div className="gx-task-pop is-right gx-task-list" role="listbox" aria-label="Show tasks">
          {FILTERS.map((item) => <button key={item.id} type="button" role="option" aria-selected={item.id === filter} onClick={() => { setFilter(item.id); setFilterOpen(false); }}>{item.label}{item.id === filter && <WorkspaceIcon name="check" size={14} />}</button>)}
        </div>}
      </div>
    </header>

    <form className="gx-sched-composer" onSubmit={describe}>
      <WorkspaceIcon name="clock" size={18} />
      <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={l("describeTask", "Describe a task, e.g. “every morning at 8 send me the weather”")} aria-label="Describe a task" maxLength={2000} />
      <button type="submit" aria-label="Create task" disabled={!draft.trim()}><WorkspaceIcon name="arrow-up" size={17} /></button>
    </form>

    {error && <p className="wp-error" role="alert">{error}</p>}

    {recipes.length > 0 && <section className="gx-sched-section">
      <button type="button" className="gx-sched-section-toggle" aria-expanded={showRecipes} onClick={() => setShowRecipes(!showRecipes)}>{l("recommended", "Recommended")}<WorkspaceIcon name="chevron-down" size={13} /></button>
      {showRecipes && <ul className="gx-sched-rows">
        {recipes.map((recipe) => <li key={recipe.id}>
          <span className="gx-sched-tile">{recipe.icon}</span>
          <span className="gx-sched-copy"><strong>{recipe.title}</strong><small>{recipe.hint}</small></span>
          <button type="button" className="gx-sched-add" aria-label={`Add ${recipe.title}`} disabled={Boolean(adding)} onClick={() => void add(recipe)}>{adding === recipe.id ? <span className="gx-sched-spinner" /> : <WorkspaceIcon name="plus" size={18} />}</button>
        </li>)}
      </ul>}
    </section>}

    <section className="gx-sched-section">
      <h2 className="gx-sched-section-title">{FILTERS.find((item) => item.id === filter)!.label}<span>{shown.length || ""}</span></h2>
      {tasks === null ? <ul className="gx-sched-rows" aria-busy="true">{[0, 1].map((index) => <li key={index} className="is-loading"><span className="gx-sched-tile" /><span className="gx-sched-copy"><span /><span /></span></li>)}</ul>
        : shown.length === 0 ? <p className="gx-sched-empty">{filter === "active" ? "No active tasks. Describe one above or add a recommendation." : `No ${filter} tasks.`}</p>
        : <ul className="gx-sched-rows">
          {shown.map((task) => <li key={task.id}>
            <button type="button" className="gx-sched-row" onClick={() => openTask(task.id)}>
              <span className="gx-sched-tile"><WorkspaceIcon name={task.status === "paused" ? "pause" : "clock"} size={18} /></span>
              <span className="gx-sched-copy"><strong>{task.title}</strong><small>{task.running ? "Running…" : describeTask(task)}{task.lastError ? " · Last run failed" : ""}</small></span>
              <WorkspaceIcon name="chevron" size={14} />
            </button>
          </li>)}
        </ul>}
    </section>
  </section>;
}
