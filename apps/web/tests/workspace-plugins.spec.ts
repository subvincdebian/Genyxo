import { expect, test, type Page, type Route } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const categories = [
  { id: "popular", name: "Popular", description: "A collection of useful, notable plugins." },
  { id: "new", name: "New & noteworthy", description: "Recently added plugins worth a look." },
  { id: "developer", name: "Developer tools", description: "Code, issues, databases and deployments." },
  { id: "productivity", name: "Productivity", description: "Documents, calendars, tasks and notes." },
  { id: "finance", name: "Finance & crypto", description: "Payments and live market data." },
];
function plugin(id: string, name: string, description: string, cats: string[], extra: Record<string, unknown> = {}) {
  return {
    id, name, description, categories: cats, categoryNames: cats.map((cat) => categories.find((item) => item.id === cat)?.name || cat),
    about: `${name} plugin page text unique to ${id}.`,
    prompts: [`First ${name} prompt`, `Second ${name} prompt`, `Third ${name} prompt`],
    permissions: ["Read your data"], capabilities: [`Use ${name} from chat`], apps: [{ name, description: `${name} connector` }],
    website: `https://${id}.example.com/`, version: "1.0.0", tint: "#5e6ad2", developer: "Genyxo",
    auth: { type: "oauth", provider: name }, authorization: "OAuth", configured: true, unavailableReason: null, status: "available", policy: "ask", connection: null,
    ...extra,
  };
}

async function plugins(page: Page, options: { connected?: string[] } = {}) {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  const state = { connected: new Set(options.connected || []), requests: [] as string[], policy: "ask" };
  const all = () => [
    plugin("gmail", "Gmail", "Read and manage Gmail", ["popular", "productivity"], { auth: { type: "oauth", provider: "Google" } }),
    plugin("linear", "Linear", "Plan and build products", ["popular", "developer"], { auth: { type: "mcp", provider: "Linear", open: false }, authorization: "OAuth (MCP)" }),
    plugin("shopify", "Shopify", "Create and manage your store", ["popular"], { auth: { type: "token", fields: [{ key: "shop", label: "Store domain", placeholder: "your-store.myshopify.com", secret: false, optional: false }, { key: "token", label: "Admin API access token", placeholder: "shpat_…", secret: true, optional: false }], help: "Create a custom app.", docsUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps" }, authorization: "API key" }),
    plugin("vercel", "Vercel", "Projects, deployments and status", ["developer"], { auth: { type: "mcp", provider: "Vercel", open: false }, authorization: "OAuth (MCP)" }),
    plugin("binance", "Binance", "Explore Binance market data", ["finance", "new"], { auth: { type: "none" }, authorization: "None" }),
    plugin("zoom", "Zoom", "Schedule and review meetings", ["productivity"], { configured: false, status: "unconfigured", unavailableReason: "This server has no Zoom app credentials yet." }),
    plugin("shazam", "Shazam", "Identify songs instantly", ["new"], { auth: { type: "unavailable" }, configured: false, status: "unavailable", unavailableReason: "Shazam has no public web API." }),
  ].map((item) => state.connected.has(item.id) ? { ...item, status: "connected", policy: state.policy, connection: { account: `${item.id}@example.com`, connectedAt: "2026-10-20T10:00:00Z", scopes: [], tools: item.id === "linear" ? [{ name: "list_issues", readOnly: true }, { name: "create_issue", readOnly: false }] : [] } } : item);
  await mockApi(page, async (route: Route, path: string) => {
    const method = route.request().method();
    if (path.startsWith("/integrations")) state.requests.push(`${method} ${path}`);
    if (path === "/integrations") { await route.fulfill({ json: { categories, encryptionAvailable: true, plugins: all() } }); return true; }
    const match = path.match(/^\/integrations\/([\w-]+)(?:\/(\w+))?$/);
    if (match) {
      const [, id, verb] = match;
      if (!verb && method === "GET") { const found = all().find((item) => item.id === id); await route.fulfill(found ? { json: found } : { status: 404, json: { message: "Unknown plugin" } }); return true; }
      if (!verb && method === "DELETE") { state.connected.delete(id); await route.fulfill({ json: { disconnected: true, revoked: true } }); return true; }
      if (verb === "authorize") { await route.fulfill({ json: { url: `https://${id}.example.com/oauth/authorize?client_id=dcr&state=sealed` } }); return true; }
      if (verb === "enable") { state.connected.add(id); await route.fulfill({ json: { connected: true } }); return true; }
      if (verb === "settings") { state.policy = route.request().postDataJSON().policy; await route.fulfill({ json: { policy: state.policy } }); return true; }
      if (verb === "token") {
        const fields = route.request().postDataJSON().fields;
        if (fields.token === "bad") { await route.fulfill({ status: 400, json: { message: "Shopify rejected these credentials" } }); return true; }
        state.connected.add(id); await route.fulfill({ json: { connected: true } }); return true;
      }
    }
    if (path.startsWith("/chat/workspace")) { await route.fulfill({ json: path === "/chat/workspace" ? { conversations: [], projects: [], preferences: {}, capabilities: {} } : { items: [], connections: [] } }); return true; }
    return false;
  });
  return state;
}

test("catalog mirrors the ChatGPT layout with categories, rows and category pages", async ({ page }) => {
  await plugins(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/plugins");
  await expect(page.getByRole("heading", { level: 1, name: "Plugins" })).toBeVisible();
  await expect(page.getByText("Connect plugins so Genyxo can work with your tools")).toBeVisible();
  await expect(page.getByText("Your connected apps will appear here.")).toBeVisible();
  for (const name of ["Popular", "New & noteworthy", "Developer tools", "Finance & crypto"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  const popular = page.getByRole("region", { name: "Popular" });
  await expect(popular.getByRole("listitem")).toHaveCount(3);
  // Real brand logos load from /images/plugins.
  const logos = popular.locator("img.gx-plugin-logo:visible");
  await expect(logos).toHaveCount(3);
  expect(await logos.evaluateAll((items) => items.every((item) => (item as HTMLImageElement).complete && (item as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const rows = await popular.getByRole("listitem").evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  expect(rows[0]).toBe(rows[1]);
  await expect(page.getByRole("region", { name: "New & noteworthy" }).getByText("No public API")).toBeVisible();
  await page.screenshot({ path: "../../docs/design/plugins-catalog.png", animations: "disabled" });

  await page.getByRole("button", { name: "Developer tools", exact: true }).click();
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.locator("[aria-current=page]")).toHaveText("Developer tools");
  await crumbs.getByRole("button", { name: "Plugins" }).click();
  await page.getByRole("searchbox", { name: "Search plugins" }).fill("market");
  await expect(page.getByRole("region", { name: "Results" }).getByRole("listitem")).toHaveCount(1);
});

test("a row opens the plugin page with breadcrumbs, banner prompts, apps and connect", async ({ page }) => {
  const state = await plugins(page);
  await page.route("https://linear.example.com/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Linear sign-in</h1>" }));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/plugins");
  await page.getByRole("region", { name: "Popular" }).getByRole("link", { name: /Linear/ }).click();
  await expect(page).toHaveURL(/\/plugins\/linear$/);
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs).toContainText("Plugins");
  await expect(crumbs.locator("[aria-current=page]")).toHaveText("Linear");
  await expect(page.getByRole("heading", { level: 1, name: "Linear" })).toBeVisible();
  await expect(page.getByText("By Genyxo • Plan and build products")).toBeVisible();
  await expect(page.locator(".pl-prompt")).toHaveCount(3);
  await expect(page.getByText("Linear plugin page text unique to linear.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Apps\s*1/ })).toBeVisible();
  await page.screenshot({ path: "../../docs/design/plugin-page.png", animations: "disabled" });
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page).toHaveURL(/linear\.example\.com\/oauth\/authorize\?client_id=dcr/);
  expect(state.requests).toContain("POST /integrations/linear/authorize");
});

test("token plugins connect on their page with every field", async ({ page }) => {
  await plugins(page);
  await page.goto("/plugins/shopify");
  const form = page.locator("#connect");
  await expect(form.getByRole("link", { name: /Where to get it/ })).toHaveAttribute("href", "https://help.shopify.com/en/manual/apps/app-types/custom-apps");
  await form.getByLabel("Store domain").fill("demo.myshopify.com");
  await form.getByLabel("Admin API access token").fill("bad");
  await form.getByRole("button", { name: "Connect" }).click();
  await expect(form.getByRole("alert")).toHaveText("Shopify rejected these credentials");
  await form.getByLabel("Admin API access token").fill("shpat_good");
  await form.getByRole("button", { name: "Connect" }).click();
  await expect(page.getByText("Connected as shopify@example.com")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try in chat" })).toBeVisible();
});

test("public-data plugins turn on with + and unavailable ones explain why", async ({ page }) => {
  const state = await plugins(page);
  await page.goto("/plugins");
  await page.getByRole("region", { name: "Finance & crypto" }).getByRole("button", { name: "Connect Binance" }).click();
  await expect(page.getByRole("region", { name: "Installed" }).getByRole("link", { name: "Binance" })).toBeVisible();
  expect(state.requests).toContain("POST /integrations/binance/enable");
  await page.goto("/plugins/shazam");
  await expect(page.getByRole("note")).toContainText("no public web API");
  await expect(page.getByRole("button", { name: "No public API" }).first()).toBeDisabled();
});

test("Manage opens plugin settings: Allow policy, account, uses, tools and data; View details goes back", async ({ page }) => {
  const state = await plugins(page, { connected: ["linear"] });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/plugins");
  // Installed tiles keep the logo centred; the search pill draws the only focus ring.
  const tile = page.getByRole("region", { name: "Installed" }).getByRole("link", { name: "Linear" });
  const [tileBox, logoBox] = [await tile.boundingBox(), await tile.locator("img").boundingBox()];
  expect(tileBox!.width).toBe(52);
  expect(Math.abs(tileBox!.x + tileBox!.width / 2 - (logoBox!.x + logoBox!.width / 2))).toBeLessThan(1);
  expect(Math.abs(tileBox!.y + tileBox!.height / 2 - (logoBox!.y + logoBox!.height / 2))).toBeLessThan(1);
  await page.getByRole("searchbox", { name: "Search plugins" }).focus();
  expect(await page.getByRole("searchbox", { name: "Search plugins" }).evaluate((element) => getComputedStyle(element).outlineStyle)).toBe("none");
  await page.screenshot({ path: "../../docs/design/plugins-installed.png", animations: "disabled" });
  await page.getByRole("region", { name: "Popular" }).getByRole("button", { name: "Actions for Linear" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem")).toHaveText(["Try now", "Manage", "Delete"]);
  await menu.getByRole("menuitem", { name: "Manage" }).click();
  await expect(page).toHaveURL(/\/plugins\/linear\/settings$/);
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link", { name: "Plugin settings" })).toHaveAttribute("href", "/plugins?view=installed");
  await expect(page.getByText("linear@example.com")).toBeVisible();
  await expect(page.getByRole("region", { name: "Tools" })).toContainText("create_issue");
  const data = page.getByRole("region", { name: "Data" });
  for (const text of ["Developer tools", "Genyxo", "1.0.0", "https://linear.example.com/", "View privacy policy", "View terms and conditions", "OAuth (MCP)"]) await expect(data).toContainText(text);

  await page.getByRole("button", { name: "Always ask" }).click();
  await page.getByRole("menuitemradio", { name: /Allow low-risk actions/ }).click();
  await expect(page.getByRole("button", { name: "Allow low-risk actions" })).toBeVisible();
  expect(state.policy).toBe("low-risk");
  await page.screenshot({ path: "../../docs/design/plugin-settings.png", animations: "disabled" });

  await page.getByRole("link", { name: "View details" }).click();
  await expect(page).toHaveURL(/\/plugins\/linear$/);
  await expect(page.getByRole("button", { name: "Try in chat" })).toBeVisible();
  await page.getByRole("link", { name: "Manage" }).click();
  await page.getByRole("button", { name: "Remove" }).click();
  await page.getByRole("dialog", { name: "Delete" }).getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/plugins\/linear$/);
  expect(state.requests).toContain("DELETE /integrations/linear");
});

test("Try in chat and banner prompts open a new chat with the prompt, never sent", async ({ page }) => {
  await plugins(page, { connected: ["linear"] });
  let sent = false;
  await page.route("**/api/chat/stream", (route) => { sent = true; return route.abort(); });
  await page.goto("/plugins/linear");
  await expect(page.locator("#userInput")).toBeAttached();
  await expect(page.getByRole("button", { name: "Try in chat" })).toBeVisible();
  await page.locator(".pl-prompt").nth(1).click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.locator("#userInput")).toHaveValue("Second Linear prompt");
  expect(sent).toBe(false);
});

test("phone width keeps the catalog, plugin page and settings in one column", async ({ page }) => {
  await plugins(page, { connected: ["linear"] });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/plugins");
  await expect(page.getByRole("region", { name: "Popular" }).getByRole("listitem")).toHaveCount(3);
  const lefts = await page.getByRole("region", { name: "Popular" }).getByRole("listitem").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().left)));
  expect(new Set(lefts).size).toBe(1);
  for (const url of ["/plugins", "/plugins/linear", "/plugins/linear/settings"]) {
    await page.goto(url);
    await expect(page.locator(".pl-page")).toBeVisible();
    expect(await page.locator(".pl-page").evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
  }
  await page.goto("/plugins/linear");
  await page.screenshot({ path: "../../docs/design/plugin-page-mobile.png", animations: "disabled" });
});

test("light theme keeps rows legible", async ({ page }) => {
  await plugins(page);
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await page.goto("/plugins");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.locator(".pl-row-copy strong").first().evaluate((element) => getComputedStyle(element).color)).toBe("rgb(16, 22, 20)");
  // Dark-glyph brands switch to their dark file on light tiles.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Developer tools", exact: true }).click();
  await expect(page.locator(".pl-list .gx-logo-on-light").first()).toBeVisible();
  await page.screenshot({ path: "../../docs/design/plugins-catalog-light.png", animations: "disabled" });
});

test("a proposed email is a confirm card that sends only after Confirm", async ({ page }) => {
  const fence = "```";
  const card = { id: "6c1f6f1e-2c39-4b7e-9f8e-1d6b9b7a0c11", plugin: "gmail", pluginName: "Gmail", title: "Send email", fields: [{ label: "To", value: "anna@example.com" }, { label: "Subject", value: "Launch plan" }], body: "Hi Anna,\nThe plan is attached.", status: "pending" };
  const reply = `I prepared the email.\n\n${fence}genyxo-action\n${JSON.stringify(card)}\n${fence}\n\nConfirm to send it.`;
  await authenticate(page);
  const calls: string[] = [];
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/stream") {
      const events = [{ conversationId: 41 }, { status: "activity", step: "Gmail · Sending email" }, ...(reply.match(/[\s\S]{1,40}/g) || []).map((token) => ({ token })), { status: "done", messageId: 501, creditBalance: 140 }];
      await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") });
      return true;
    }
    if (path.startsWith("/integrations/actions/")) {
      calls.push(`${route.request().method()} ${path}`);
      await route.fulfill({ json: { id: card.id, status: "done", result: { summary: "Send email — done", url: "https://mail.google.com/mail/u/0/#sent/m1" } } });
      return true;
    }
    return false;
  });
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#userInput").fill("Email Anna the launch plan");
  await page.keyboard.press("Enter");
  const action = page.locator(".gx-action-card");
  await expect(action).toHaveAttribute("data-status", "pending");
  await expect(action.locator("dd").first()).toHaveText("anna@example.com");
  await expect(action.locator(".gx-action-body")).toContainText("The plan is attached.");
  expect(calls).toEqual([]);
  await page.screenshot({ path: "../../docs/design/plugins-confirm-card.png", animations: "disabled" });
  await action.getByRole("button", { name: "Confirm" }).click();
  await expect(action).toHaveAttribute("data-status", "done");
  await expect(action.getByRole("link", { name: /Open/ })).toHaveAttribute("href", "https://mail.google.com/mail/u/0/#sent/m1");
  expect(calls).toEqual([`POST /integrations/actions/${card.id}/confirm`]);
});
