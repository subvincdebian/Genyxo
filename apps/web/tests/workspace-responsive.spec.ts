import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

test("workspace fits phones, tablets, short screens and wide desktops", async ({ page }) => {
  test.setTimeout(420000);
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, path) => {
    if (!path.startsWith("/chat/workspace")) return false;
    const resource = path.replace("/chat/workspace", "");
    await route.fulfill({ json: !resource ? { conversations: [{ id: 21, title: "Workspace research", lastActivityAt: new Date().toISOString() }], projects: [{ id: 5, name: "Research", files: [] }], preferences: { timezone: "UTC" }, capabilities: {} } : resource === "/plugins" ? { items: [], connections: [] } : resource === "/scheduled" ? { items: [], available: false } : { items: [], folders: [], hasMore: false } });
    return true;
  });
  for (const [width, height] of [[320, 568], [390, 660], [768, 1024], [1024, 600], [1440, 900], [2560, 1080], [844, 390], [320, 400]]) {
    await page.setViewportSize({ width, height });
    for (const route of ["chat", "library", "plugins", "scheduled"]) {
      await page.goto(`/${route}`);
      await expect(page.locator(".workspace-shell")).toBeVisible();
      if (route !== "chat") await expect(page.locator(".wp-page")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} overflow at ${width}×${height}`).toBe(true);
    }
    if (width < 768) await page.getByRole("button", { name: "Open navigation" }).click();
    const menu = page.locator(".workspace-sidebar").getByRole("button", { name: "Menu", exact: true });
    await expect(menu).toBeInViewport();
    await menu.click();
    await expect(page.getByRole("menu").last()).toBeInViewport();
    await page.keyboard.press("Escape");
    if (width < 768) await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.screenshot({ path: "../../docs/design/workspace-desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 660 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator(".workspace-sidebar")).toBeVisible();
  await page.screenshot({ path: "../../docs/design/workspace-mobile.png", animations: "disabled" });
});
