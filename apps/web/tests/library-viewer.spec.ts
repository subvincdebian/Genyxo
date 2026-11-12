import { readFileSync } from "fs";
import path from "path";
import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const IMAGE = "11111111-1111-4111-8111-111111111111";
const AUDIO = "22222222-2222-4222-8222-222222222222";
const png = readFileSync(path.join(__dirname, "../public/images/plugins/xmind.png"));

async function library(page: Page) {
  await authenticate(page);
  const items = [
    { id: 1, name: "Neon city at night", type: "image", url: `/api/chat/media/${IMAGE}`, content: "Neon city at night, rain", isFavorite: false, conversationId: 42, createdAt: "2026-10-20" },
    { id: 2, name: "Calm piano loop", type: "audio", url: `/api/chat/media/${AUDIO}`, content: "Calm piano loop", isFavorite: false, conversationId: 42, createdAt: "2026-10-19" },
    { id: 3, name: "Launch notes", type: "document", content: "Ship on Monday", isFavorite: false, createdAt: "2026-10-18" },
  ];
  await mockApi(page, async (route, path) => {
    if (path === `/chat/media/${IMAGE}`) { await route.fulfill({ contentType: "image/png", body: png }); return true; }
    if (path === `/chat/media/${AUDIO}`) { await route.fulfill({ contentType: "audio/wav", body: Buffer.alloc(64) }); return true; }
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { libraryView: "grid" }, capabilities: {} } }); return true; }
    if (path === "/chat/workspace/library") { await route.fulfill({ json: { items, folders: [], hasMore: false } }); return true; }
    if (path === "/chat/workspace/library/1" && route.request().method() === "PATCH") { Object.assign(items[0], route.request().postDataJSON()); await route.fulfill({ json: items[0] }); return true; }
    return false;
  });
}

test("library shows generated media in a masonry and opens a full-screen viewer", async ({ page }) => {
  await library(page);
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await expect(page.locator(".lb-grid .lb-tile")).toHaveCount(3);
  await expect(page.locator(".lb-grid img[src*='/api/chat/media/']")).toBeVisible();
  // Newest items run along the first row.
  const [first, second] = await page.locator(".lb-tile").evaluateAll((tiles) => tiles.slice(0, 2).map((tile) => tile.getBoundingClientRect().top));
  expect(Math.abs(first - second)).toBeLessThan(2);

  await page.getByRole("button", { name: "Open Neon city at night", exact: true }).click();
  const viewer = page.getByRole("dialog", { name: "Neon city at night" });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole("img", { name: "Neon city at night" })).toBeVisible();
  await expect(viewer.getByRole("button", { name: "Zoom" })).toContainText("%");
  await expect(viewer.getByRole("link", { name: "Download" })).toHaveAttribute("download", "Neon city at night.png");
  await expect(viewer.getByRole("button", { name: "Share" })).toBeVisible();
  await expect(viewer.getByText("Neon city at night, rain")).toBeVisible();

  await viewer.getByRole("button", { name: "Zoom" }).click();
  await page.getByRole("menuitemradio", { name: "100 %" }).click();
  await expect(viewer.getByRole("button", { name: "Zoom" })).toContainText("100 %");

  await viewer.getByRole("button", { name: "Favorite", exact: true }).click();
  await expect(viewer.getByRole("button", { name: "Favorites", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Calm piano loop" }).locator("audio")).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(page.locator(".lb-viewer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Calm piano loop", exact: true })).toBeFocused();
});

test("asking about a file starts a new chat with the file attached", async ({ page }) => {
  await library(page);
  let sent: { message?: string; files?: unknown[] } | null = null;
  await page.route("**/api/chat/stream", async (route) => {
    const body = route.request().postData() || "";
    sent = { message: body.includes("What is in this picture?") ? "What is in this picture?" : "", files: body.includes("Neon city at night.png") ? [1] : [] };
    await route.fulfill({ status: 200, contentType: "text/event-stream", body: `data: ${JSON.stringify({ status: "done", messageId: 1, creditBalance: 100 })}\n\n` });
  });
  await page.goto("/library");
  await page.getByRole("button", { name: "Open Neon city at night", exact: true }).click();
  await page.getByRole("textbox", { name: "Ask about this file" }).fill("What is in this picture?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page).toHaveURL(/\/chat/);
  await expect.poll(() => sent?.message).toBe("What is in this picture?");
  expect(sent!.files).toHaveLength(1);
});

test("library viewer and toolbar fit a phone screen", async ({ page }) => {
  await library(page);
  await page.setViewportSize({ width: 375, height: 760 });
  await page.goto("/library");
  await expect(page.locator(".lb-tile")).toHaveCount(3);
  expect(await page.locator(".lb-page").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.getByRole("button", { name: "Open Neon city at night", exact: true }).click();
  const box = await page.locator(".lb-viewer img").boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 375).toBeTruthy();
  await expect(page.getByRole("textbox", { name: "Ask about this file" })).toBeInViewport();
});
