import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";
import {
  defaultAppearance,
  contrastRatio,
} from "../src/fsd/shared/lib/appearance";
import { exportTheme, importTheme } from "../src/fsd/shared/lib/theme-codec";

const code =
  'codex-theme-v1:{"codeThemeId":"linear","theme":{"accent":"#606acc","accentSource":"custom","contrast":60,"fonts":{"code":null,"ui":"Inter"},"ink":"#e3e4e6","opaqueWindows":true,"semanticColors":{"diffAdded":"#69c967","diffRemoved":"#ff7e78","skill":"#c2a1ff"},"surface":"#0f0f11"},"variant":"dark"}';

test("theme codes preserve supported settings and reject invalid colors and versions", () => {
  const imported = importTheme(code, defaultAppearance);
  expect(imported.variant).toBe("dark");
  expect(imported.appearance.dark).toMatchObject({
    preset: "Linear",
    accent: "#606acc",
    foreground: "#e3e4e6",
    fonts: { ui: "Inter", code: null },
    opaqueWindows: true,
    semanticColors: { skill: "#c2a1ff" },
  });
  const appearance = {
    ...imported.appearance,
    uiSize: 18,
    codeSize: 16,
    contrast: 0,
    diff: "markers" as const,
  };
  expect(
    importTheme(exportTheme(appearance, "dark"), defaultAppearance).appearance,
  ).toEqual(appearance);
  expect(() =>
    importTheme(
      code.replace("#606acc", "url(javascript:alert(1))"),
      defaultAppearance,
    ),
  ).toThrow();
  expect(() =>
    importTheme(code.replace("theme-v1", "theme-v2"), defaultAppearance),
  ).toThrow();
  expect(() => importTheme("{}", defaultAppearance)).toThrow();
});

test.beforeEach(async ({ page }) => {
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    if (path !== "/chat/workspace") return false;
    await route.fulfill({
      json: {
        conversations: [],
        projects: [],
        preferences: { timezone: "UTC", timezoneInitialized: true },
        capabilities: {},
      },
    });
    return true;
  });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
});

test("additional controls collapse, reset independently and use inline switches", async ({
  page,
}, info) => {
  await page.goto("/profile#appearance");
  const additional = page.getByRole("button", {
    name: "Additionally",
    exact: true,
  });
  await expect(additional).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByLabel("Interface font size", { exact: true }),
  ).not.toBeVisible();
  await expect(page.locator("kbd")).toHaveCount(0);
  await additional.click();
  await page.getByLabel("Interface font size", { exact: true }).fill("18");
  const diff = page.getByRole("radiogroup", {
    name: "Code difference markers",
  });
  await diff.getByRole("radio", { name: "+/−", exact: true }).click();
  await expect(
    diff.getByRole("radio", { name: "+/−", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("radiogroup", { name: "Reduce motion" })
    .getByRole("radio", { name: "On", exact: true })
    .click();
  const reset = page.getByRole("button", {
    name: "Reset to default settings",
    exact: true,
  });
  await expect(reset).toBeVisible();
  await page
    .getByRole("combobox", { name: "Theme preset", exact: true })
    .click();
  await page.getByRole("option", { name: "Linear", exact: true }).click();
  await reset.click();
  await expect(
    page.getByLabel("Interface font size", { exact: true }),
  ).toHaveValue("14");
  await expect(
    diff.getByRole("radio", { name: "Color", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(reset).not.toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Theme preset", exact: true }),
  ).toContainText("Linear");
  await page.screenshot({
    path: info.outputPath("additional-dark.png"),
    fullPage: true,
  });
});

test("theme import validates pasted codes, supports Escape, copy and expiring toast", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/profile#appearance");
  const trigger = page.getByRole("button", {
    name: "Import theme",
    exact: true,
  });
  await trigger.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Import theme");
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Import theme", exact: true });
  await dialog.getByLabel("Theme code").fill("invalid");
  await dialog
    .getByRole("button", { name: "Import theme", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  dialog = page.getByRole("dialog", { name: "Import theme", exact: true });
  await dialog.getByLabel("Theme code").fill(code);
  await page.screenshot({
    path: info.outputPath("theme-import.png"),
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Import theme", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--gx-accent")
          .trim(),
      ),
    )
    .toBe("#606acc");
  const copied = page.getByRole("button", { name: "Copy theme", exact: true });
  await copied.click();
  await expect(page.getByRole("status")).toContainText("Theme copied");
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(
    importTheme(clipboard, defaultAppearance).appearance.dark.semanticColors
      ?.diffAdded,
  ).toBe("#69c967");
  await expect(page.getByRole("status")).toHaveCount(0, { timeout: 4500 });
  await copied.click();
  await page
    .getByRole("status")
    .getByRole("button", { name: "Dismiss", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("sidebar collapse persists, search reopens it and theme transitions keep light contrast", async ({
  page,
}, info) => {
  await page.goto("/profile#appearance");
  const sidebar = page.getByRole("complementary", {
    name: "Settings navigation",
    exact: true,
  });
  await sidebar.hover();
  await page
    .getByRole("button", { name: "Collapse sidebar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Appearance", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Search settings", exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand sidebar", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("sidebar-rail.png"),
    fullPage: true,
  });
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("searchbox", { name: "Search settings", exact: true }),
  ).toBeFocused();
  await page.evaluate(() => {
    const root = document.documentElement;
    const animate = root.animate.bind(root);
    root.animate = (frames, options) => {
      if (
        typeof options === "object" &&
        options.pseudoElement === "::view-transition-new(root)"
      )
        Reflect.set(window, "__themeReveal", { frames, options });
      return animate(frames, options);
    };
  });
  await page.getByRole("radio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__themeReveal")))
    .toMatchObject({
      options: { pseudoElement: "::view-transition-new(root)", duration: 440 },
    });
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-gx-theme-transition",
    "true",
  );
  const colors = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ["--gx-bg", "--gx-text", "--gx-muted"].map((key) =>
      style.getPropertyValue(key).trim(),
    );
  });
  expect(contrastRatio(colors[0], colors[1])).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(colors[0], colors[2])).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({
    path: info.outputPath("appearance-light.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Additionally", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .locator("#additional-appearance")
    .evaluate((element) =>
      Promise.all(
        element
          .getAnimations()
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
    );
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: info.outputPath("additional-mobile.png"),
    fullPage: true,
  });
});

test("preset colors reach the actual chat surface and keep Home independent", async ({
  page,
}) => {
  await page.goto("/profile#appearance");
  await page
    .getByRole("combobox", { name: "Theme preset", exact: true })
    .click();
  await page.getByRole("option", { name: "Dracula", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--gx-bg")
          .trim(),
      ),
    )
    .toBe("#282a36");
  await page.goto("/chat");
  await expect(page.locator(".workspace-shell")).toHaveCSS(
    "background-color",
    "rgb(40, 42, 54)",
  );
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.dataset.gxAppearance),
  ).toBeUndefined();
});

test("system mode follows device changes and reduced motion skips the circular reveal", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/profile#appearance");
  await page.getByRole("radio", { name: "System", exact: true }).click();
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue(
    "#0c0d0d",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue(
    "#f8faf9",
  );
  await page.getByRole("button", { name: "Additionally", exact: true }).click();
  await page
    .getByRole("radiogroup", { name: "Reduce motion" })
    .getByRole("radio", { name: "On", exact: true })
    .click();
  await page.evaluate(() => {
    const root = document.documentElement;
    const animate = root.animate.bind(root);
    Reflect.set(window, "__themeReveals", 0);
    root.animate = (frames, options) => {
      if (
        typeof options === "object" &&
        options.pseudoElement === "::view-transition-new(root)"
      )
        Reflect.set(
          window,
          "__themeReveals",
          Number(Reflect.get(window, "__themeReveals")) + 1,
        );
      return animate(frames, options);
    };
  });
  await page.getByRole("radio", { name: "Dark", exact: true }).click();
  // Dark is the default token set; the existing theme service removes data-theme.
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("radio", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("Background", { exact: true })).toHaveValue(
    "#0c0d0d",
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-gx-theme-transition",
    "true",
  );
  expect(await page.evaluate(() => Reflect.get(window, "__themeReveals"))).toBe(
    0,
  );
});
