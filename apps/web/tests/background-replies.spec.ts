import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const sse = (...events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
const chat = { id: 41, title: "Weekend plans", projectId: null, pinnedAt: null, archivedAt: null, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

test("a reply that keeps generating after leaving shimmers in the sidebar and appears when done", async ({ page }) => {
  let generating = true;
  let saved = false;
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [chat], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/workspace/generating") { await route.fulfill({ json: { conversationIds: generating ? [41] : [] } }); return true; }
    if (path === "/chat/history/41") {
      await route.fulfill({ json: [{ id: 1, sender: "user", content: "Plan my weekend" }, ...(saved ? [{ id: 2, sender: "bot", content: "Saturday: hike. Sunday: museum." }] : [])] });
      return true;
    }
    return false;
  });
  await page.goto("/chat?id=41");

  const title = page.locator('[data-workspace-chat="41"] .ws-row-title');
  await expect(title).toHaveClass(/is-generating/);
  // The open chat shows the question and an orb saying the answer is still coming.
  await expect(page.locator("#chatBox .user-message")).toContainText("Plan my weekend");
  await expect(page.locator(".gx-pending-reply .gx-think-label")).toHaveText("Still answering…");

  saved = true;
  generating = false;
  await expect(page.locator("#chatBox .bot-message").last()).toContainText("Saturday: hike", { timeout: 10_000 });
  await expect(page.locator(".gx-pending-reply")).toHaveCount(0);
  await expect(title).not.toHaveClass(/is-generating/);
});

test("Stop ends the reply on the server, and the call button hides while answering", async ({ page }) => {
  const stops: unknown[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [chat], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/workspace/generating") { await route.fulfill({ json: { conversationIds: [] } }); return true; }
    if (path === "/chat/history/41") { await route.fulfill({ json: [{ id: 1, sender: "user", content: "Hi" }, { id: 2, sender: "bot", content: "Hello" }] }); return true; }
    if (path === "/chat/workspace/stop") { stops.push(route.request().postDataJSON()); await route.fulfill({ json: { stopped: 1 } }); return true; }
    if (path === "/chat/stream") { await gate; await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ done: true, conversationId: 41 }) }).catch(() => undefined); return true; }
    return false;
  });
  await page.goto("/chat?id=41");
  await expect(page.locator("#chatBox .bot-message")).toContainText("Hello");
  await expect(page.locator(".gx-call-btn")).toBeVisible();

  await page.locator("#userInput").fill("Tell me more");
  await page.keyboard.press("Enter");
  await expect(page.locator(".gx-stop-btn")).toBeVisible();
  await expect(page.locator(".gx-call-btn")).toBeHidden();
  await expect(page.locator("#voiceBtn")).toBeVisible();

  await page.locator(".gx-stop-btn").click();
  await expect.poll(() => stops).toEqual([{ conversationId: 41 }]);
  release();
});
