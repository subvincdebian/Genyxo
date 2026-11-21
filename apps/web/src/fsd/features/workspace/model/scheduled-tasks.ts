"use client";
import { useCallback, useEffect, useState } from "react";
import { workspaceRequest } from "./types";

export type Repeat = "once" | "daily" | "weekdays" | "weekly" | "monthly";
export type TaskStatus = "active" | "paused" | "completed";
export type ScheduledTask = {
  id: number;
  title: string;
  prompt: string;
  schedule: { repeat: Repeat; time: string; date: string };
  summary: string;
  timezone: string;
  status: TaskStatus;
  conversationId: number | null;
  model: string;
  hasLocation: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  runs: number;
  running: boolean;
};

export const REPEAT_LABELS: Record<Repeat, string> = {
  once: "Once",
  daily: "Every day",
  weekdays: "Weekdays",
  weekly: "Every week",
  monthly: "Every month",
};

/** "26 Oct 2026 · 20:19" in the task's own time zone. */
export function formatRun(value: string | null, timeZone: string) {
  if (!value) return "";
  const date = new Date(value);
  try {
    const day = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric", timeZone }).format(date);
    const time = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(date);
    return `${day} · ${time}`;
  } catch {
    return date.toLocaleString();
  }
}

/** "Every weekday at 08:00", "Once · 26 Oct 2026 · 20:19". */
export function describeTask(task: ScheduledTask) {
  if (task.status === "completed") return "Completed";
  if (task.status === "paused") return `Paused · ${REPEAT_LABELS[task.schedule.repeat]}`;
  if (task.schedule.repeat === "once") return formatRun(task.nextRunAt, task.timezone);
  const weekday = new Date(`${task.schedule.date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: "long", timeZone: "UTC" });
  const every = { daily: "Every day", weekdays: "Every weekday", weekly: `Every ${weekday}`, monthly: `Monthly, day ${Number(task.schedule.date.slice(8))}` }[task.schedule.repeat];
  return `${every} · ${task.schedule.time}`;
}

/** Every open card and panel shows the same task: edits anywhere are announced. */
export function announceTask(task: ScheduledTask | { id: number; deleted: true }) {
  document.dispatchEvent(new CustomEvent("genyxo:task-updated", { detail: task }));
}
export function openTask(id: number) {
  document.dispatchEvent(new CustomEvent("genyxo:open-task", { detail: { id } }));
}

export async function patchTask(id: number, body: Record<string, unknown>) {
  const task = await workspaceRequest<ScheduledTask>(`scheduled/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  announceTask(task);
  return task;
}
export async function createTask(body: Record<string, unknown>) {
  const task = await workspaceRequest<ScheduledTask>("scheduled", { method: "POST", body: JSON.stringify(body) });
  announceTask(task);
  return task;
}
export async function deleteTask(id: number) {
  await workspaceRequest(`scheduled/${id}`, { method: "DELETE" });
  announceTask({ id, deleted: true });
}
export async function runTask(id: number) {
  const task = await workspaceRequest<ScheduledTask>(`scheduled/${id}/run`, { method: "POST" });
  announceTask(task);
  return task;
}

/** One task, kept fresh: reloads after edits elsewhere and while it is due or running. */
export function useScheduledTask(id: number | null) {
  const [task, setTask] = useState<ScheduledTask | null>(null);
  const [missing, setMissing] = useState(false);
  const load = useCallback(async () => {
    if (!id) return;
    try { setTask(await workspaceRequest<ScheduledTask>(`scheduled/${id}`)); setMissing(false); } catch { setMissing(true); }
  }, [id]);
  useEffect(() => {
    if (!id) return;
    void Promise.resolve().then(load);
    const updated = (event: Event) => {
      const detail = (event as CustomEvent<ScheduledTask | { id: number; deleted: true }>).detail;
      if (detail.id !== id) return;
      if ("deleted" in detail) { setMissing(true); setTask(null); } else setTask(detail);
    };
    document.addEventListener("genyxo:task-updated", updated);
    // A finished reply may be this task's run.
    const finished = () => void load();
    document.addEventListener("genyxo:generation-finished", finished);
    return () => { document.removeEventListener("genyxo:task-updated", updated); document.removeEventListener("genyxo:generation-finished", finished); };
  }, [id, load]);
  // Look again when it is due and while it runs.
  useEffect(() => {
    if (!task) return;
    const due = task.nextRunAt ? new Date(task.nextRunAt).getTime() - Date.now() : Infinity;
    const wait = task.running ? 3000 : due < 0 ? 5000 : due < 86_400_000 ? due + 4000 : 0;
    if (!wait) return;
    const timer = setTimeout(() => void load(), wait);
    return () => clearTimeout(timer);
  }, [task, load]);
  return { task, missing, reload: load };
}
