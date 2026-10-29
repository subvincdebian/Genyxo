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

test("appearance controls collapse, reset all settings and use inline switches", async ({
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
  ).toContainText("Genyxo");
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

test("background-only edits copy complete JSON and import in a fresh browser context", async ({
  page,
  context,
  browser,
  baseURL,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Exercise the clipboard fallback used when the async API is unavailable.
  await page.addInitScript(() => {
    navigator.clipboard.writeText = async () => {
      throw new DOMException("Not allowed", "NotAllowedError");
    };
  });
  await page.goto("/profile#appearance");
  await page.getByLabel("Background", { exact: true }).fill("#263636");
  await expect(
    page.getByRole("button", {
      name: "Reset to default settings",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copy theme", exact: true }).click();
  const toast = page.getByRole("status");
  await expect(toast).toContainText("Theme copied");
  const bounds = await toast.boundingBox();
  const viewportWidth = await page.evaluate(() => innerWidth);
  expect(
    Math.abs(bounds!.x + bounds!.width / 2 - viewportWidth / 2),
  ).toBeLessThan(2);
  expect(bounds!.y).toBeLessThan(25);
  expect(
    await toast.evaluate((element) =>
      element.contains(
        document.elementFromPoint(
          element.getBoundingClientRect().x + 30,
          element.getBoundingClientRect().y + 10,
        ),
      ),
    ),
  ).toBe(true);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const snapshot = JSON.parse(copied);
  expect(snapshot).toMatchObject({
    format: "genyxo-theme",
    version: 1,
    mode: "dark",
    language: "en",
    appearance: {
      dark: { background: "#263636" },
      light: defaultAppearance.light,
    },
  });
  const other = await browser.newContext({ baseURL });
  try {
    const destination = await other.newPage();
    await authenticate(destination);
    await mockApi(destination);
    await destination.goto("/profile#appearance");
    await destination
      .getByRole("button", { name: "Import theme", exact: true })
      .click();
    const dialog = destination.getByRole("dialog", {
      name: "Import theme",
      exact: true,
    });
    await expect(dialog.getByLabel("Theme code")).toHaveAttribute(
      "placeholder",
      "genyxo-theme",
    );
    await dialog.getByLabel("Theme code").fill(copied);
    await dialog
      .getByRole("button", { name: "Import theme", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      destination.getByLabel("Background", { exact: true }),
    ).toHaveValue("#263636");
    expect(
      await destination.evaluate(() =>
        JSON.parse(localStorage.getItem("genyxo.appearance")!),
      ),
    ).toEqual(snapshot.appearance);
    await destination.reload();
    await expect(
      destination.getByLabel("Background", { exact: true }),
    ).toHaveValue("#263636");
  } finally {
    await other.close();
  }
  await page.screenshot({
    path: info.outputPath("feedback-viewport.png"),
    fullPage: false,
  });
});

test("icon tooltips render above content and modal close hover never changes geometry", async ({
  page,
}, info) => {
  await page.goto("/profile#appearance");
  for (const name of [
    "Import theme",
    "Copy theme",
    "System",
    "Light",
    "Dark",
  ]) {
    const control = page.getByRole(
      ["System", "Light", "Dark"].includes(name) ? "radio" : "button",
      { name, exact: true },
    );
    await control.hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toHaveText(name);
    const rect = await tip.boundingBox();
    expect(rect!.width).toBeGreaterThan(40);
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    const button = await control.boundingBox();
    expect(
      Math.min(
        Math.abs(button!.y - rect!.y - rect!.height),
        Math.abs(rect!.y - button!.y - button!.height),
      ),
    ).toBeLessThanOrEqual(9);
  }
  await page.getByRole("button", { name: "Import theme", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Import theme",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
  const before = await dialog.boundingBox();
  await dialog.getByRole("button", { name: "Close", exact: true }).hover();
  await expect(page.getByRole("tooltip")).toHaveText("Close");
  const after = await dialog.boundingBox();
  expect(
    Math.abs(before!.x - after!.x) + Math.abs(before!.y - after!.y),
  ).toBeLessThan(1);
  expect(
    await dialog.evaluate(
      (element) =>
        element.scrollWidth <= element.clientWidth &&
        element.scrollHeight <= element.clientHeight,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("modal-tooltip.png"),
    fullPage: false,
  });
});

test("language select stays attached while scrolling and animates dismissal", async ({
  page,
}, info) => {
  await page.goto("/profile#appearance");
  await page.getByRole("button", { name: "Additionally", exact: true }).click();
  const trigger = page.getByRole("combobox", {
    name: "Interface language",
    exact: true,
  });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const list = page.getByRole("listbox", {
    name: "Interface language",
    exact: true,
  });
  await expect(list).toBeVisible();
  const gap = async () => {
    const a = await trigger.boundingBox(),
      b = await list.boundingBox();
    return Math.min(
      Math.abs(b!.y - a!.y - a!.height),
      Math.abs(a!.y - b!.y - b!.height),
    );
  };
  await expect.poll(gap).toBeLessThanOrEqual(8);
  await page.mouse.wheel(0, -120);
  await expect.poll(gap).toBeLessThanOrEqual(8);
  await page.screenshot({
    path: info.outputPath("anchored-select.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(page.locator('[popover][data-state="closed"]')).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("sidebar hover controls and drag resizing persist without easing behind the pointer", async ({
  page,
}) => {
  await page.goto("/profile#appearance");
  const sidebar = page.getByRole("complementary", {
    name: "Settings navigation",
    exact: true,
  });
  const toggle = page.getByRole("button", {
    name: "Collapse sidebar",
    exact: true,
  });
  await page.getByRole("heading", { name: "Appearance", exact: true }).hover();
  await expect(toggle).toHaveCSS("opacity", "0");
  await sidebar.hover();
  await expect(toggle).toHaveCSS("opacity", "1");
  const handle = page.getByRole("separator", {
    name: "Resize settings sidebar",
    exact: true,
  });
  const rect = await handle.boundingBox();
  const initial = await sidebar.boundingBox();
  await page.mouse.move(rect!.x + rect!.width / 2, rect!.y + 80);
  await page.mouse.down();
  await page.mouse.move(rect!.x + rect!.width / 2 + 70, rect!.y + 80, {
    steps: 10,
  });
  await page.mouse.up();
  await expect
    .poll(async () => (await sidebar.boundingBox())!.width)
    .toBeGreaterThan(initial!.width + 50);
  const width = (await sidebar.boundingBox())!.width;
  await page.reload();
  await expect
    .poll(async () => (await sidebar.boundingBox())!.width)
    .toBe(width);
  await sidebar.hover();
  await toggle.click();
  const expand = page.getByRole("button", {
    name: "Expand sidebar",
    exact: true,
  });
  await page.getByRole("heading", { name: "Appearance", exact: true }).hover();
  await expect(expand).toHaveCSS("opacity", "0");
  await sidebar.hover();
  await expect(expand).toHaveCSS("opacity", "1");
});
