import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

test("workspace headers and navigation keep their own geometry", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, path) => {
    if (!path.startsWith("/chat/workspace")) return false;
    await route.fulfill({ json: path === "/chat/workspace" ? { conversations: [{ id: 31, title: "Workspace research", lastActivityAt: new Date().toISOString() }], projects: [], preferences: { timezone: "UTC" }, capabilities: {} } : { items: [], connections: [] } });
    return true;
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/plugins");
  await expect(page.locator(".wp-catalog-heading")).toHaveCSS("display", "grid");
  const heading = (await page.locator(".wp-catalog-heading").boundingBox())!;
  const tabs = (await page.locator(".wp-main-tabs").boundingBox())!;
  expect(Math.abs(tabs.x + tabs.width / 2 - heading.x - heading.width / 2)).toBeLessThan(1);
  await expect(page.locator(".ws-sidebar-header")).toHaveCSS("justify-content", "space-between");
  // Body controls share the text face; catalog titles use the display face.
  const fonts = await page.locator('.ws-new-chat .ws-expanded-label, .wp-search input').evaluateAll((elements) => elements.map((element) => getComputedStyle(element).fontFamily));
  expect(new Set(fonts).size).toBe(1);
  expect(fonts[0]).toMatch(/^"?Inter"?,/);
  await expect(page.locator(".wp-main-tabs button").first()).toHaveCSS("font-family", /^"?Inter Tight"?,/);
  await expect(page.locator(".ws-new-chat")).toHaveCSS("border-top-width", "0px");
  const rows = await page.locator(".ws-sidebar-nav > .ws-tooltip-owner > .ws-nav-item").evaluateAll((elements) => elements.map((element) => {
    const label = element.querySelector(".ws-expanded-label")!;
    const icon = element.querySelector("svg")!;
    const row = element.getBoundingClientRect(), text = label.getBoundingClientRect(), glyph = icon.getBoundingClientRect();
    return { textX: text.x, iconX: glyph.x, rowHeight: row.height, offset: Math.abs(text.y + text.height / 2 - glyph.y - glyph.height / 2) };
  }));
  expect(rows).toHaveLength(5);
  for (const row of rows) {
    expect(row.rowHeight).toBe(40);
    expect(row.textX).toBe(rows[0].textX);
    expect(row.iconX).toBe(rows[0].iconX);
    expect(row.offset).toBeLessThan(1);
  }
  await page.keyboard.press("Control+Shift+s");
  await expect(page.locator(".workspace-sidebar")).toHaveCSS("width", "64px");
  const expand = (await page.getByRole("button", { name: "Expand sidebar", exact: true }).boundingBox())!;
  const newChat = (await page.locator(".ws-new-chat").boundingBox())!;
  expect(Math.abs(expand.x + expand.width / 2 - newChat.x - newChat.width / 2)).toBeLessThan(1);
  await page.keyboard.press("Control+Shift+s");
  await expect(page.locator(".workspace-sidebar")).toHaveCSS("width", "280px");
  await page.screenshot({ path: "../../docs/design/workspace-aligned-desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 760 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.screenshot({ path: "../../docs/design/workspace-aligned-mobile.png", animations: "disabled" });
});
