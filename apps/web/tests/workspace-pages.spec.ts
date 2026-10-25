import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

async function workspace(page: Page) {
  await authenticate(page);
  const documents: Array<{ id: number; name: string; content: string; type: string; isFavorite: boolean; createdAt: string; folderId?: number | null }> = [{ id: 1, name: "Research notes", content: "A useful document", type: "document", isFavorite: false, createdAt: "2026-10-17" }];
  const folders = [{ id: 2, name: "Ideas" }];
  const presets = [{ id: 3, name: "Writer", description: "Clear writing", instructions: "Write clearly", isPublic: true, version: 1 }];
  await mockApi(page, async (route, path) => {
    if (!path.startsWith("/chat/workspace")) return false;
    const suffix = path.replace("/chat/workspace", "");
    const method = route.request().method();
    let json: unknown = {};
    if (!suffix) json = { conversations: [], projects: [], preferences: { libraryView: "grid" }, capabilities: {} };
    else if (suffix === "/library") {
      if (method === "POST") { const item = { ...route.request().postDataJSON(), id: documents.length + 1, isFavorite: false, createdAt: "2026-10-17" }; documents.push(item); await route.fulfill({ json: item }); return true; }
      const query = new URL(route.request().url()).searchParams;
      json = { items: documents.filter((item) => (!query.get("search") || item.name.includes(query.get("search")!)) && (query.get("tab") !== "favorites" || item.isFavorite)), folders, hasMore: false };
    } else if (suffix === "/library/1" && method === "PATCH") {
      Object.assign(documents[0], route.request().postDataJSON()); json = documents[0];
    } else if (suffix === "/folders" && method === "POST") { const folder = { ...route.request().postDataJSON(), id: folders.length + 2 }; folders.push(folder); json = folder; }
    else if (/^\/presets\/\d+$/.test(suffix)) {
      const index = presets.findIndex((item) => item.id === Number(suffix.split("/").at(-1)));
      if (method === "PATCH") { Object.assign(presets[index], route.request().postDataJSON()); json = presets[index]; }
      else if (method === "DELETE") presets.splice(index, 1);
    }
    else if (suffix === "/presets") {
      if (method === "POST") presets.push({ ...route.request().postDataJSON(), id: 4, version: 1, isPublic: false });
      json = method === "GET" ? { items: presets } : presets.at(-1);
    } else if (suffix === "/plugins") json = { items: [{ id: "calendar", name: "Calendar", description: "Calendar access", status: "unavailable", permissions: ["Read events"] }], connections: [] };
    else if (suffix === "/scheduled") json = { items: [], available: false, reason: "Scheduler is not configured" };
    await route.fulfill({ json }); return true;
  });
}

test("library filters favorites, searches and opens folders", async ({ page }) => {
  await workspace(page); await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Add Research notes to favorites" }).click();
  await page.getByRole("tab", { name: "Favorites", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Research notes" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search library" }).fill("Missing");
  await expect(page.getByText("No results found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByRole("tab", { name: "Folders", exact: true }).click();
  await page.getByRole("button", { name: "Open folder Ideas" }).click();
  await expect(page.getByRole("button", { name: "All folders", exact: true })).toBeVisible();
});

test("plugins have independent catalog scopes and skills create a personal preset", async ({ page }) => {
  await workspace(page);
  await page.route("**/api/integrations", (route) => route.fulfill({ json: { encryptionAvailable: true, categories: [{ id: "popular", name: "Popular", description: "" }], plugins: [{ id: "google-calendar", name: "Google Calendar", description: "Manage Google Calendar events", categories: ["popular"], permissions: ["Read events"], capabilities: [], auth: { type: "oauth", provider: "Google" }, configured: false, status: "unconfigured", connection: null }] } }));
  await page.goto("/plugins");
  await expect(page.getByRole("link", { name: /^Google Calendar/ })).toBeVisible();
  await page.getByRole("tab", { name: "Personal", exact: true }).click();
  await expect(page.getByRole("link", { name: /^Google Calendar/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Custom API \/ webhook/ })).toBeVisible();
  await page.getByRole("tab", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Editor");
  await page.getByLabel("Instructions", { exact: true }).fill("Edit for clarity.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Editor", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use Editor", exact: true }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page).toHaveURL(/\/chat/);
});

test("scheduled tasks explain genuine unavailable runtime", async ({ page }) => {
  await workspace(page); await page.goto("/scheduled");
  await expect(page.getByText("Scheduler is not configured", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create task", exact: true })).toBeDisabled();
});

test("workspace forms explain missing values and focus the first invalid field", async ({ page }) => {
  await workspace(page); await page.goto("/library");
  await expect(page.getByRole("button", { name: "Open Research notes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("menuitem", { name: "New document", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Name: This field is required.");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Name", { exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("library creates a document and folder, uploads text, and previews saved content", async ({ page }) => {
  await workspace(page); await page.goto("/library?tab=all");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("menuitem", { name: "New document", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Planning");
  await page.getByLabel("Content", { exact: true }).fill("Launch on Monday");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Open Planning", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Launch on Monday", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("menuitem", { name: "New folder", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Work");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("tab", { name: "Folders", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open folder Work", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "All", exact: true }).click();
  await page.locator('.wp-library input[type="file"]').setInputFiles({ name: "brief.txt", mimeType: "text/plain", buffer: Buffer.from("Uploaded briefing") });
  await page.getByRole("button", { name: "Open brief.txt", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Uploaded briefing", { exact: true })).toBeVisible();
});

test("library retries request failures and tabs work with the keyboard on a narrow screen", async ({ page }) => {
  await workspace(page); let fail = true;
  await page.route("**/api/chat/workspace/library?**", async (route) => { if (fail) { fail = false; await route.fulfill({ status: 500, json: { message: "Temporary library failure" } }); } else await route.fallback(); });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/library");
  await expect(page.getByText("Temporary library failure", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open Research notes", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Recommended", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Favorites", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await page.locator(".wp-library").evaluate((element) => element.scrollWidth <= element.clientWidth)).toBeTruthy();
});

test("public skills can be copied and personal skills can be edited and deleted", async ({ page }) => {
  await workspace(page); await page.goto("/plugins?tab=skills&scope=public");
  await page.getByRole("button", { name: "Actions for Writer", exact: true }).click();
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Writer copy", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Writer copy", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Quality editor");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quality editor", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actions for Quality editor", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quality editor", exact: true })).toHaveCount(0);
});
