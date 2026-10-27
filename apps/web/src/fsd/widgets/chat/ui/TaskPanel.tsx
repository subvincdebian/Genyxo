"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { deleteTask, describeTask, formatRun, patchTask, REPEAT_LABELS, runTask, useScheduledTask, useWorkspace, type Repeat, type ScheduledTask } from "@/features/workspace";
import { WorkspaceIcon } from "@/shared/ui/workspace";

const STATUS: Record<ScheduledTask["status"], string> = { active: "Active", paused: "Paused", completed: "Completed" };
const pad = (value: number) => String(value).padStart(2, "0");
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A small anchored sheet (calendar, time list, menu) that closes on outside click or Escape. */
function Popover({ open, onClose, children, align = "right", className = "" }: { open: boolean; onClose: () => void; children: ReactNode; align?: "left" | "right"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.parentElement?.contains(event.target as Node)) onClose(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key, true);
    ref.current?.querySelector<HTMLElement>("[aria-selected='true'], [aria-current='date'], button")?.focus({ preventScroll: true });
    ref.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "center" });
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key, true); };
  }, [open, onClose]);
  if (!open) return null;
  return <div ref={ref} className={`gx-task-pop is-${align} ${className}`}>{children}</div>;
}

/** Month grid like the system date picker; past days are off for one-off tasks. */
function Calendar({ value, onPick, allowPast }: { value: string; onPick: (date: string) => void; allowPast: boolean }) {
  const selected = new Date(`${value}T12:00:00`);
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = isoDay(new Date());
  const first = (month.getDay() + 6) % 7; // Monday first
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
  const label = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekdays = Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 1 + index).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2));
  return <div className="gx-cal" role="group" aria-label={label}>
    <div className="gx-cal-head">
      <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><WorkspaceIcon name="arrow-left" size={15} /></button>
      <strong>{label}</strong>
      <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><WorkspaceIcon name="arrow" size={15} /></button>
    </div>
    <div className="gx-cal-grid">
      {weekdays.map((day) => <span key={day} className="gx-cal-weekday">{day}</span>)}
      {cells.map((day, index) => {
        if (!day) return <span key={`blank-${index}`} />;
        const date = isoDay(new Date(month.getFullYear(), month.getMonth(), day));
        return <button key={date} type="button" className={date === today ? "is-today" : ""} aria-current={date === value ? "date" : undefined} disabled={!allowPast && date < today} onClick={() => onPick(date)}>{day}</button>;
      })}
    </div>
  </div>;
}

/** Quarter-hour times, plus the task's own time when it is between them. */
function times(current: string) {
  const list = Array.from({ length: 96 }, (_, index) => `${pad(Math.floor(index / 4))}:${pad((index % 4) * 15)}`);
  if (!list.includes(current)) list.push(current);
  return list.sort();
}

/**
 * A scheduled task, as in ChatGPT: opens beside the chat from its card or
 * from Scheduled. Everything saves as you change it.
 */
export function TaskPanel() {
  const [id, setId] = useState<number | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const open = (event: Event) => setId((event as CustomEvent<{ id: number }>).detail.id);
    document.addEventListener("genyxo:open-task", open);
    return () => document.removeEventListener("genyxo:open-task", open);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("gx-task-open", id !== null);
    if (id === null) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) setId(null); };
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); document.documentElement.classList.remove("gx-task-open"); };
  }, [id]);
  if (id === null) return null;
  return <aside className={`gx-task-panel${wide ? " is-wide" : ""}`} aria-label="Scheduled task">
    <TaskBody key={id} id={id} wide={wide} onWide={() => setWide(!wide)} onClose={() => setId(null)} />
  </aside>;
}

function TaskBody({ id, wide, onWide, onClose }: { id: number; wide: boolean; onWide: () => void; onClose: () => void }) {
  const workspace = useWorkspace();
  const { task, missing } = useScheduledTask(id);
  const [pop, setPop] = useState<"" | "repeat" | "date" | "time" | "menu">("");
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loaded = useRef(false);
  useEffect(() => {
    if (!task || loaded.current) return;
    loaded.current = true;
    setTitle(task.title);
    setPrompt(task.prompt);
  }, [task]);
  const save = async (body: Record<string, unknown>) => {
    setPop("");
    setError("");
    try { await patchTask(id, body); } catch (caught) { setError(caught instanceof Error ? caught.message : "Couldn't save"); }
  };
  const close = () => setPop("");

  const header = <header className="gx-task-head">
    <WorkspaceIcon name="clock" size={18} />
    <h2>{task?.title || "Scheduled task"}</h2>
    <button type="button" className="gx-task-icon hide-on-mobile" aria-label={wide ? "Narrower" : "Wider"} onClick={onWide}><svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d={wide ? "M8 3v5H3M12 17v-5h5" : "M3 8V3h5M17 12v5h-5"} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    <button type="button" className="gx-task-icon" aria-label="Close" onClick={onClose}><WorkspaceIcon name="close" size={16} /></button>
  </header>;
  if (missing) return <>{header}<div className="gx-task-empty"><p>This task was deleted.</p></div></>;
  if (!task) return <>{header}<div className="gx-task-body" aria-busy="true"><span className="gx-task-skeleton" /><span className="gx-task-skeleton is-tall" /><span className="gx-task-skeleton" /></div></>;

  const once = task.schedule.repeat === "once";
  const dateLabel = new Date(`${task.schedule.date}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return <>
    {header}
    <div className="gx-task-body">
      <div className="gx-task-status-row">
        <span className="gx-task-status" data-status={task.status}>{task.running ? "Running…" : STATUS[task.status]}</span>
        <div className="gx-task-pop-wrap">
          <button type="button" className="gx-task-icon" aria-label="Task actions" aria-haspopup="menu" aria-expanded={pop === "menu"} onClick={() => setPop(pop === "menu" ? "" : "menu")}><WorkspaceIcon name="more" size={18} /></button>
          <Popover open={pop === "menu"} onClose={close} className="gx-task-menu">
            <div role="menu">
              <button type="button" role="menuitem" disabled={task.running} onClick={() => { close(); void runTask(id).catch((caught) => setError(caught.message)); }}><WorkspaceIcon name="play" size={15} />Run now</button>
              {task.status !== "completed" && <button type="button" role="menuitem" onClick={() => void save({ status: task.status === "paused" ? "active" : "paused" })}><WorkspaceIcon name={task.status === "paused" ? "play" : "pause"} size={15} />{task.status === "paused" ? "Resume" : "Pause"}</button>}
              {task.conversationId && <button type="button" role="menuitem" onClick={() => { close(); workspace.selectChat(task.conversationId!); }}><WorkspaceIcon name="new" size={15} />Open chat</button>}
              <div className="gx-task-menu-divider" />
              <button type="button" role="menuitem" className="is-danger" onClick={() => { close(); setConfirmDelete(true); }}><WorkspaceIcon name="trash" size={15} />Delete</button>
            </div>
          </Popover>
        </div>
      </div>
      <input className="gx-task-title" aria-label="Task name" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} onBlur={() => { if (title.trim() && title.trim() !== task.title) void save({ title: title.trim() }); else setTitle(task.title); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
      <textarea className="gx-task-prompt" aria-label="Instructions" value={prompt} rows={3} maxLength={4000} onChange={(event) => setPrompt(event.target.value)} onBlur={() => { if (prompt.trim() && prompt.trim() !== task.prompt) void save({ prompt: prompt.trim() }); else setPrompt(task.prompt); }} />
      {error && <p className="gx-task-error" role="alert">{error}</p>}
      {confirmDelete && <div className="gx-task-confirm" role="alertdialog" aria-label="Delete task">
        <span>Delete “{task.title}”? Its past answers stay in the chat.</span>
        <button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
        <button type="button" className="is-danger" onClick={() => void deleteTask(id).then(onClose, (caught) => setError(caught.message))}>Delete</button>
      </div>}

      <h3 className="gx-task-label">Details</h3>
      <div className="gx-task-group">
        <div className="gx-task-row"><span>Runs on</span><span className="gx-task-value"><svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 15.5h8.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 5.3 9.2 3.2 3.2 0 0 0 6 15.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>Genyxo cloud</span></div>
        {task.hasLocation && <div className="gx-task-row"><span>Location</span><span className="gx-task-value"><WorkspaceIcon name="maps" size={15} />Saved for maps and weather</span></div>}
        {task.lastRunAt && <div className="gx-task-row"><span>Last run</span><span className={`gx-task-value${task.lastError ? " is-error" : ""}`}>{task.lastError ? `Failed: ${task.lastError}` : formatRun(task.lastRunAt, task.timezone)}</span></div>}
      </div>

      <h3 className="gx-task-label">Schedule</h3>
      <div className="gx-task-group">
        <div className="gx-task-row"><span>Repeat</span>
          <div className="gx-task-pop-wrap">
            <button type="button" className="gx-task-select" aria-haspopup="listbox" aria-expanded={pop === "repeat"} onClick={() => setPop(pop === "repeat" ? "" : "repeat")}>{REPEAT_LABELS[task.schedule.repeat]}<WorkspaceIcon name="chevron-down" size={13} /></button>
            <Popover open={pop === "repeat"} onClose={close} className="gx-task-list">
              <div role="listbox" aria-label="Repeat">{(Object.keys(REPEAT_LABELS) as Repeat[]).map((repeat) => <button key={repeat} type="button" role="option" aria-selected={repeat === task.schedule.repeat} onClick={() => void save({ repeat })}>{REPEAT_LABELS[repeat]}{repeat === task.schedule.repeat && <WorkspaceIcon name="check" size={14} />}</button>)}</div>
            </Popover>
          </div>
        </div>
        <div className="gx-task-row"><span>{once ? "Date" : "Starts"}</span>
          <div className="gx-task-pop-wrap">
            <button type="button" className="gx-task-select" aria-haspopup="dialog" aria-expanded={pop === "date"} onClick={() => setPop(pop === "date" ? "" : "date")}>{dateLabel}<WorkspaceIcon name="chevron-down" size={13} /></button>
            <Popover open={pop === "date"} onClose={close}><Calendar value={task.schedule.date} allowPast={!once} onPick={(date) => void save({ date })} /></Popover>
          </div>
        </div>
        <div className="gx-task-row"><span>Time</span>
          <div className="gx-task-pop-wrap">
            <button type="button" className="gx-task-select" aria-haspopup="listbox" aria-expanded={pop === "time"} onClick={() => setPop(pop === "time" ? "" : "time")}>{task.schedule.time}<WorkspaceIcon name="chevron-down" size={13} /></button>
            <Popover open={pop === "time"} onClose={close} className="gx-task-list gx-task-times">
              <div role="listbox" aria-label="Time">{times(task.schedule.time).map((time) => <button key={time} type="button" role="option" aria-selected={time === task.schedule.time} onClick={() => void save({ time })}>{time}{time === task.schedule.time && <WorkspaceIcon name="check" size={14} />}</button>)}</div>
            </Popover>
          </div>
        </div>
        <div className="gx-task-row"><span>Time zone</span><span className="gx-task-value">{task.timezone.replace(/_/g, " ")}</span></div>
      </div>
      <p className="gx-task-foot">{task.status === "active" && task.nextRunAt ? `Next: ${formatRun(task.nextRunAt, task.timezone)}` : describeTask(task)}{task.runs ? ` · Ran ${task.runs} ${task.runs === 1 ? "time" : "times"}` : ""}</p>
    </div>
  </>;
}

/** The task card under the reply that scheduled it. */
export function TaskCard({ id, title }: { id: number; title: string }) {
  const { task, missing } = useScheduledTask(id);
  const subtitle = missing ? "Deleted" : task ? (task.running ? "Running…" : describeTask(task)) : "";
  return <div className={`gx-task-card${missing ? " is-missing" : ""}`}>
    <span className="gx-task-card-icon" aria-hidden="true"><WorkspaceIcon name="clock" size={20} /></span>
    <span className="gx-task-card-copy"><strong>{task?.title || title}</strong><small>{subtitle || " "}</small></span>
    {!missing && <button type="button" onClick={() => document.dispatchEvent(new CustomEvent("genyxo:open-task", { detail: { id } }))}>Open</button>}
  </div>;
}
