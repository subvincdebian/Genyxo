import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

async function workspaceFixture(page: import("@playwright/test").Page) {
  page.on("pageerror", (error) => console.error("Workspace browser error:", error.message));
  page.on("console", (message) => { if (message.type() === "error" && message.text().includes("initialization")) console.error(message.text()); });
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    if (!path.startsWith("/chat/workspace")) return false;
    const resource = path.replace("/chat/workspace", "");
    let json: unknown = { items: [], folders: [], hasMore: false };
    if (!resource) json = {
      conversations: [{ id: 71, title: "Workspace research", projectId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
      projects: [{ id: 9, name: "Research", instructions: "Be precise", files: [] }],
      preferences: { grouping: "projects", sort: "activity", showProjects: true, timezone: "Europe/Kyiv", libraryView: "grid" },
      capabilities: {},
    };
    if (resource === "/plugins") json = { items: [], connections: [] };
    if (resource === "/scheduled") json = { items: [], available: false, reason: "Scheduler is not configured" };
    await route.fulfill({ json });
    return true;
  });
}

test("workspace layout retains sidebar and composer DOM across section navigation", async ({ page }) => {
  await workspaceFixture(page);
  await page.goto("/chat");
  const sidebar = page.locator(".workspace-sidebar");
  await expect(sidebar).toBeVisible();
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#userInput").fill("A draft that belongs to this workspace");
  await page.evaluate(() => {
    (window as unknown as { originalSidebar: Element | null }).originalSidebar = document.querySelector(".workspace-sidebar");
    (window as unknown as { originalComposer: Element | null }).originalComposer = document.querySelector("#userInput");
  });
  await sidebar.getByRole("link", { name: /Library/i }).click();
  await expect(page).toHaveURL(/\/library/);
  await expect(page.getByRole("heading", { name: /Library/i }).first()).toBeVisible();
  await sidebar.getByRole("link", { name: /Plugins/i }).click();
  await expect(page).toHaveURL(/\/plugins/);
  await page.goBack();
  await page.goBack();
  await expect(page.locator("#userInput")).toHaveValue("A draft that belongs to this workspace");
  expect(await page.evaluate(() => {
    const original = window as unknown as { originalSidebar: Element; originalComposer: Element };
    return original.originalSidebar === document.querySelector(".workspace-sidebar") && original.originalComposer === document.querySelector("#userInput");
  })).toBe(true);
});

test("mobile drawer locks background scrolling and restores it on close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 660 });
  await workspaceFixture(page);
  await page.goto("/chat");
  const previousOverflow = await page.evaluate(() => document.body.style.overflow);
  await page.getByRole("button", { name: /Open navigation/i }).click();
  await expect(page.locator(".workspace-sidebar")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(previousOverflow);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("keyboard search and collapse work without changing the draft", async ({ page }) => {
  await workspaceFixture(page);
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#userInput").fill("Preserve me");
  await page.keyboard.press("Control+Shift+s");
  await expect(page.locator(".workspace-shell")).toHaveClass(/is-collapsed/);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: /Search chats/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#userInput")).toHaveValue("Preserve me");
});

test("first-send network failure offers Retry, which reuses its request key", async ({ page }) => {
  await workspaceFixture(page);
  const sends: Array<{ clientRequestId: string; message: string }> = [];
  await page.route("**/api/chat/stream", async (route) => {
    sends.push(route.request().postDataJSON());
    if (sends.length === 1) return route.abort("failed");
    await route.fulfill({ contentType: "text/event-stream", body: 'data: {"status":"conversation","conversationId":72}\n\ndata: {"token":"Saved response"}\n\ndata: {"status":"done","conversationId":72,"creditBalance":149}\n\n' });
  });
  await page.goto("/chat");
  const input = page.locator("#userInput");
  await expect(input).toBeEnabled();
  await page.locator(".ws-new-chat").click();
  expect(sends).toHaveLength(0);
  await input.fill("Keep this prompt after a network error");
  await input.press("Enter");
  // The question stays in the chat; Retry re-sends it with the same request key.
  const failure = page.locator(".gx-turn-error");
  await expect(failure).toContainText("The connection dropped");
  await expect(page.locator("#chatBox .user-message")).toContainText("Keep this prompt after a network error");
  await expect(input).toBeEnabled();
  await failure.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator("#chatBox")).toContainText("Saved response");
  await expect(page.locator("#chatBox .user-message")).toHaveCount(1);
  expect(sends).toHaveLength(2);
  expect(sends[0].clientRequestId).toBeTruthy();
  expect(sends[1].clientRequestId).toBe(sends[0].clientRequestId);
});
