import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

type Task = { id: number; title?: string; prompt?: string; status: string; schedule: Record<string, string | undefined>; [key: string]: unknown };
type Body = Record<string, string | undefined> & { location?: unknown };
const sse = (...events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
const inAMinute = () => new Date(Date.now() + 60_000).toISOString();
const baseTask = (): Task => ({
  id: 12, title: "Hello in a minute", prompt: "Write the user exactly «Hello».", schedule: { repeat: "once", time: "20:19", date: "2026-10-26" },
  summary: "Once", timezone: "Europe/Kyiv", status: "active", conversationId: 41, model: "m", hasLocation: false,
  nextRunAt: inAMinute(), lastRunAt: null, lastError: null, runs: 0, running: false,
});

async function setup(page: Page, options: { history?: object[]; reply?: string; tasks?: Task[] } = {}) {
  const tasks: Task[] = options.tasks ?? [baseTask()];
  const calls: { method: string; path: string; body?: Body }[] = [];
  let share: Record<string, unknown> = { shared: false };
  await authenticate(page);
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 50.45, longitude: 30.52 });
  await mockApi(page, async (route, path) => {
    const method = route.request().method();
    const body: Body = method === "GET" || method === "DELETE" ? {} : route.request().postDataJSON();
    if (path.startsWith("/chat/workspace/scheduled") || path.includes("/share")) calls.push({ method, path, body });
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [{ id: 41, title: "Plan the greeting", projectId: null, createdAt: "2026-10-26", updatedAt: "2026-10-26" }], projects: [], preferences: { timezone: "Europe/Kyiv", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/history/41") { await route.fulfill({ json: options.history ?? [{ id: 1, sender: "user", content: "Text me Hello in a minute" }, { id: 2, sender: "bot", content: "✅ Done!\n\n```genyxo-task\n{\"id\":12,\"title\":\"Hello in a minute\"}\n```\n" }] }); return true; }
    if (path === "/chat/workspace/scheduled" && method === "GET") { await route.fulfill({ json: { items: tasks, available: true } }); return true; }
    if (path === "/chat/workspace/scheduled" && method === "POST") { const task = { ...baseTask(), id: 30 + tasks.length, title: body.title, prompt: body.prompt, schedule: { repeat: body.repeat, time: body.time, date: body.date || "2026-10-27" }, hasLocation: Boolean(body.location) }; tasks.unshift(task); await route.fulfill({ json: task }); return true; }
    const match = /^\/chat\/workspace\/scheduled\/(\d+)(\/run)?$/.exec(path);
    if (match) {
      const task = tasks.find((item) => item.id === Number(match[1]));
      if (!task) { await route.fulfill({ status: 404, json: { message: "Task not found" } }); return true; }
      if (method === "PATCH") {
        Object.assign(task, body.status ? { status: body.status } : {}, body.title ? { title: body.title } : {}, body.prompt ? { prompt: body.prompt } : {});
        for (const key of ["repeat", "time", "date"]) if (body[key]) task.schedule[key] = body[key];
      }
      if (method === "DELETE") { tasks.splice(tasks.indexOf(task), 1); await route.fulfill({ json: { success: true } }); return true; }
      await route.fulfill({ json: task });
      return true;
    }
    if (path === "/chat/workspace/conversations/41/share") {
      if (method === "POST") share = { shared: true, token: "AbCdEfGhIjKlMnOpQrSt", path: "/share/AbCdEfGhIjKlMnOpQrSt", sharedAt: "2026-10-26T18:00:00Z", upToDate: true };
      if (method === "DELETE") share = { shared: false };
      await route.fulfill({ json: share });
      return true;
    }
    if (path === "/chat/stream") { await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ token: options.reply ?? "ok", conversationId: 41 }, { done: true, conversationId: 41 }) }); return true; }
    return false;
  });
  return { calls, tasks };
}

test("a scheduled task shows as a card that opens an editable side panel", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/chat?id=41");
  const card = page.locator(".gx-task-card");
  await expect(card).toContainText("Hello in a minute");
  await expect(card.locator("small")).toContainText(" · ");
  await card.getByRole("button", { name: "Open" }).click();

  const panel = page.getByRole("complementary", { name: "Scheduled task" });
  await expect(panel.locator(".gx-task-status")).toHaveText("Active");
  await expect(panel.getByLabel("Instructions")).toHaveValue("Write the user exactly «Hello».");
  await panel.getByRole("button", { name: "20:19" }).click();
  await panel.getByRole("option", { name: "21:00" }).click();
  await panel.getByRole("button", { name: "Once" }).click();
  await panel.getByRole("option", { name: "Every day" }).click();
  await expect(panel.getByRole("button", { name: "Every day" })).toBeVisible();
  await panel.getByRole("button", { name: /Oct 26, 2026|26 Oct 2026/ }).click();
  await panel.locator(".gx-cal").getByRole("button", { name: "Next month" }).click();
  await panel.locator(".gx-cal-grid button", { hasText: /^3$/ }).click();
  await panel.getByRole("button", { name: "Task actions" }).click();
  await panel.getByRole("menuitem", { name: "Pause" }).click();
  await expect(panel.locator(".gx-task-status")).toHaveText("Paused");
  // The card follows the panel.
  await expect(card.locator("small")).toHaveText("Paused · Every day");
  expect(calls.filter((call) => call.method === "PATCH").map((call) => call.body)).toEqual([{ time: "21:00" }, { repeat: "daily" }, { date: "2026-11-03" }, { status: "paused" }]);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});

test("a task's run shows as a header with the task name, not a user bubble", async ({ page }) => {
  await setup(page, { history: [{ id: 3, sender: "user", content: "```genyxo-task-run\n{\"id\":12,\"title\":\"Hello in a minute\",\"prompt\":\"Write «Hello».\"}\n```" }, { id: 4, sender: "bot", content: "Hello" }] });
  await page.goto("/chat?id=41");
  const run = page.locator(".gx-task-run");
  await expect(run).toHaveText("Hello in a minute");
  await expect(page.locator("#chatBox .user-message")).toHaveCount(0);
  await run.click();
  await expect(page.locator(".gx-task-run-prompt")).toHaveText("Write «Hello».");
});

test("Scheduled lists tasks by state and adds a recommendation with the user's location", async ({ page }) => {
  const { calls } = await setup(page, { tasks: [baseTask(), { ...baseTask(), id: 13, title: "Old reminder", status: "completed", nextRunAt: null }] });
  await page.goto("/scheduled");
  const rows = page.locator(".gx-sched-row");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Hello in a minute");
  await page.getByRole("button", { name: "Active" }).click();
  await page.getByRole("option", { name: "Completed" }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Old reminder");
  await expect(rows.first()).toContainText("Completed");

  await page.getByRole("button", { name: "Add Morning briefing" }).click();
  await expect(page.getByRole("complementary", { name: "Scheduled task" })).toBeVisible();
  const created = calls.find((call) => call.method === "POST")!;
  expect(created.body).toMatchObject({ title: "Morning briefing", repeat: "weekdays", time: "08:00", location: { lat: 50.45, lng: 30.52 } });
  await expect(page.getByRole("button", { name: "Add Morning briefing" })).toHaveCount(0);
});

test("Share creates a public link with a preview and share targets", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/chat?id=41");
  await expect(page.locator(".gx-task-card")).toBeVisible();
  await page.locator(".gx-chat-action.is-share").click();
  const dialog = page.getByRole("dialog", { name: "Share chat" });
  await expect(dialog.locator(".gx-share-preview")).toContainText("Plan the greeting");
  await expect(dialog.locator(".gx-share-preview")).toContainText("Text me Hello in a minute");
  await dialog.getByRole("button", { name: "Create link" }).click();
  await expect(dialog.locator(".gx-share-link-text")).toHaveText(/\/share\/AbCdEfGhIjKlMnOpQrSt$/);
  await expect(dialog.getByRole("link", { name: "Share on Telegram" })).toHaveAttribute("href", /t\.me\/share\/url\?url=.*share%2FAbCdEfGhIjKlMnOpQrSt/);
  await dialog.getByRole("button", { name: "Delete link" }).click();
  await expect(dialog.getByRole("button", { name: "Create link" })).toBeVisible();
  expect(calls.filter((call) => call.path.endsWith("/share")).map((call) => call.method)).toEqual(["GET", "POST", "DELETE"]);
});
