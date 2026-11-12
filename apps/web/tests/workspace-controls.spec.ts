import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, path) => {
    if (!path.startsWith("/chat/workspace")) return false;
    await route.fulfill({ json: path === "/chat/workspace" ? { conversations: [], projects: [], preferences: {}, capabilities: {} } : { items: [], connections: [] } });
    return true;
  });
});

test("Overview opens beside its trigger and repeated clicks close menus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/plugins");
  const trigger = page.getByRole("button", { name: "Overview", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const buttonBox = (await trigger.boundingBox())!, menuBox = (await menu.boundingBox())!;
  expect(menuBox.x).toBeGreaterThanOrEqual(buttonBox.x + buttonBox.width);
  expect(Math.abs(menuBox.y - buttonBox.y)).toBeLessThan(20);
  expect(menuBox.width).toBeLessThanOrEqual(200);
  await expect(menu.locator('svg[data-icon="maps"]').first()).toBeVisible();
  await trigger.click();
  await expect(menu).toHaveCount(0);
  await trigger.press("Enter");
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  const add = page.getByRole("button", { name: "Add", exact: true });
  await add.click(); await expect(menu).toBeVisible();
  await add.click(); await expect(menu).toHaveCount(0);
  await trigger.click();
  await page.screenshot({ path: "test-results/design/workspace-premium-controls.png", animations: "disabled" });
});

test("icon controls have accessible tooltips with an exit transition and hover-only motion", async ({ page }) => {
  await page.goto("/plugins");
  const settings = page.getByRole("button", { name: "Integration settings", exact: true });
  await settings.hover();
  const tooltip = page.getByRole("tooltip", { name: "Integration settings", exact: true });
  await expect(tooltip).toBeVisible();
  const tooltipId = await tooltip.getAttribute("id");
  await expect(settings).toHaveAttribute("aria-describedby", tooltipId as string);
  // Genyxo icons play one short sequence per hover and return to their drawn shape.
  const icon = settings.locator(".gi-gear");
  await expect(icon).toHaveCSS("animation-name", "gi-spin-gear");
  await expect(icon).toHaveCSS("animation-iteration-count", "1");
  await expect(icon).toHaveCSS("animation-duration", "0.9s");
  const transition = await tooltip.evaluate(element => getComputedStyle(element).transitionDuration);
  expect(transition.split(",").some(duration => Number.parseFloat(duration) > 0)).toBe(true);
  await page.screenshot({ path: "test-results/design/workspace-premium-tooltip.png", animations: "disabled" });
  await page.mouse.move(1100, 750);
  // Closing hints leave the accessibility tree immediately, then unmount after motion.
  await expect(page.locator(`[id="${tooltipId}"]`)).toHaveCount(0);
  await expect(tooltip).toHaveCount(0);
  await expect(icon).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await settings.hover();
  await expect(icon).toHaveCSS("animation-name", "none");
  await expect(tooltip).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tooltip).toHaveCount(0);
  await page.keyboard.press("Tab");
  await settings.focus();
  await expect(tooltip).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await settings.hover();
  const box = (await tooltip.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(312);
});

test("Overview and tooltips stay inside narrow and short viewports", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/plugins");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  const menu = page.getByRole("menu"), box = (await menu.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(312);
  await page.screenshot({ path: "test-results/design/workspace-premium-controls-mobile.png", animations: "disabled" });
});
