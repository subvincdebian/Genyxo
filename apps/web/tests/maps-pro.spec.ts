import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const here = { latitude: 50.4501, longitude: 30.5234 };
const novus = { id: "N1", name: "Novus", lat: 50.4466, lng: 30.5231, kind: "supermarket", distance: 390, address: "Khreshchatyk 22" };
const route = {
  mode: "walking", distance: 420, duration: 330,
  geometry: [[30.5234, 50.4501], [30.5236, 50.4490], [30.5233, 50.4478], [30.5231, 50.4466]],
  steps: [],
  maneuvers: [
    { lat: 50.4501, lng: 30.5234, type: "depart", distance: 120, instruction: "Head south on Khreshchatyk" },
    { lat: 50.4490, lng: 30.5236, type: "turn", modifier: "right", name: "Prorizna", distance: 130, instruction: "Turn right onto Prorizna" },
    { lat: 50.4478, lng: 30.5233, type: "turn", modifier: "left", name: "Pushkinska", distance: 140, instruction: "Turn left onto Pushkinska" },
    { lat: 50.4466, lng: 30.5231, type: "arrive", distance: 0, instruction: "Arrive at your destination" },
  ],
};
const card = { type: "places", query: "supermarket", origin: { lat: here.latitude, lng: here.longitude }, radius: 1500, places: [novus] };
const sse = (...events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
const chat = { id: 41, title: "Weekend plans", projectId: null, pinnedAt: null, archivedAt: null, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };

async function setup(page: Page, options: { saved?: object[]; onStream?: (body: Record<string, unknown>) => void; onLibrary?: (body: unknown) => void; generating?: () => number[] } = {}) {
  let saved = options.saved || [];
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation(here);
  await authenticate(page);
  await mockApi(page, async (route_, path) => {
    const method = route_.request().method();
    if (path === "/chat/workspace") { await route_.fulfill({ json: { conversations: [chat], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/workspace/generating") { await route_.fulfill({ json: { conversationIds: options.generating?.() || [] } }); return true; }
    if (path.startsWith("/chat/workspace/library") && method === "GET") { await route_.fulfill({ json: { items: saved, folders: [], hasMore: false } }); return true; }
    if (path === "/chat/workspace/library" && method === "POST") {
      const body = route_.request().postDataJSON();
      options.onLibrary?.(body);
      saved = [...saved, { id: 90 + saved.length, name: body.name, type: "place", content: body.content }];
      await route_.fulfill({ json: saved.at(-1) });
      return true;
    }
    if (path.startsWith("/chat/maps/where")) { await route_.fulfill({ json: { label: "Khreshchatyk 22", city: "Kyiv" } }); return true; }
    if (path.startsWith("/chat/maps/route")) { await route_.fulfill({ json: route }); return true; }
    if (path === "/chat/history/41") { await route_.fulfill({ json: [{ id: 1, sender: "user", content: "Plan my weekend" }] }); return true; }
    if (path === "/chat/stream") {
      options.onStream?.(route_.request().postDataJSON());
      await route_.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ token: "Here.", conversationId: 7 }, { token: `\n\n\`\`\`genyxo-map\n${JSON.stringify(card)}\n\`\`\`\n\n`, conversationId: 7 }, { done: true, conversationId: 7 }) });
      return true;
    }
    return false;
  });
}

test("Go starts Apple-style turn-by-turn navigation that follows you to the end", async ({ page }) => {
  await setup(page);
  await page.goto("/maps");
  await page.locator(".gx-maps-cta").click();
  await page.locator(".gx-maps-suggestions button").first().click();
  const answer = page.locator(".gx-mapcard");
  await answer.locator(".gx-mapcard-row", { hasText: "Novus" }).click();
  await answer.getByRole("button", { name: "Directions" }).click();
  await answer.getByRole("button", { name: "Go" }).click();

  const nav = page.getByRole("dialog", { name: "Directions to Novus" });
  await expect(nav).toBeVisible();
  await expect(nav.locator(".gx-nav-copy span")).toHaveText("Turn right onto Prorizna");
  await expect(nav.locator(".gx-nav-eta small").first()).toHaveText("arrival");

  // Walking past the first turn moves the card on to the next one.
  await page.context().setGeolocation({ latitude: 50.4486, longitude: 30.5235 });
  await expect(nav.locator(".gx-nav-copy span")).toHaveText("Turn left onto Pushkinska");
  await page.context().setGeolocation({ latitude: 50.44662, longitude: 30.52311 });
  await expect(nav.locator(".gx-nav-card.is-arrived")).toContainText("Arrived");
  await nav.getByRole("button", { name: "End" }).click();
  await expect(nav).toHaveCount(0);
});

test("starring a place saves it to My Places, shows it in the Library and in the @ menu", async ({ page }) => {
  const posts: unknown[] = [];
  const bodies: Record<string, unknown>[] = [];
  await setup(page, { onLibrary: (body) => posts.push(body), onStream: (body) => bodies.push(body) });
  await page.goto("/maps");
  await page.locator(".gx-maps-cta").click();
  await page.locator(".gx-maps-suggestions button").first().click();
  const answer = page.locator(".gx-mapcard");
  await answer.locator(".gx-mapcard-row", { hasText: "Novus" }).click();
  await answer.getByRole("button", { name: "☆ Save" }).click();
  await expect(answer.getByRole("button", { name: "★ Saved" })).toBeVisible();
  expect(posts[0]).toEqual(expect.objectContaining({ name: "Novus", type: "place" }));
  expect(JSON.parse((posts[0] as { content: string }).content)).toEqual(expect.objectContaining({ lat: 50.4466, lng: 30.5231, address: "Khreshchatyk 22" }));

  // "@" lists it under My Places and sends its coordinates with the message.
  const input = page.locator("#userInput");
  await input.click();
  await page.keyboard.type("Is @nov");
  await expect(page.locator(".gx-cp-label", { hasText: "My Places" })).toBeVisible();
  await page.locator(".gx-cp-row", { hasText: "Khreshchatyk 22" }).click();
  await page.keyboard.type("open now?");
  await page.keyboard.press("Enter");
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1].pinnedPlaces).toEqual([expect.objectContaining({ name: "Novus", lat: 50.4466, lng: 30.5231 })]);

  await page.goto("/library?tab=places");
  await expect(page.locator(".gx-places-row", { hasText: "Novus" })).toBeVisible();
  await expect(page.locator(".gx-places-shortcut", { hasText: "Home" })).toContainText("Add in Maps");
});

test("an answer that finishes elsewhere marks the chat unread and offers notifications", async ({ page }) => {
  let busy = true;
  await setup(page, { generating: () => (busy ? [41] : []) });
  await page.goto("/chat");
  const row = page.locator('[data-workspace-chat="41"]');
  await expect(row.locator(".ws-row-title")).toHaveClass(/is-generating/);
  busy = false;
  await expect(row.locator(".ws-unread-dot")).toBeVisible({ timeout: 10_000 });
  await row.locator(".ws-row-open").click();
  await expect(row.locator(".ws-unread-dot")).toHaveCount(0);

  // The first reply in this tab offers notifications in a glass pill
  // (headless browsers report "denied", so the test asks as a fresh visitor would).
  await page.evaluate(() => { localStorage.removeItem("genyxo:notify-asked"); Object.defineProperty(Notification, "permission", { get: () => "default" }); });
  await page.locator("#userInput").fill("Hi");
  await page.keyboard.press("Enter");
  await expect(page.locator(".gx-notify-offer")).toContainText("Get a notification when answers are ready");
  await page.locator(".gx-notify-offer").getByRole("button", { name: "Not now" }).click();
  await expect(page.locator(".gx-notify-offer")).toHaveCount(0);
});

test("during a voice call, a map the model finds slides up on the voice stage", async ({ page }) => {
  await setup(page);
  await page.goto("/maps");
  await page.evaluate((data) => {
    const stage = document.createElement("div");
    stage.className = "gx-voice-stage";
    document.body.append(stage);
    document.documentElement.setAttribute("data-voice-mode", "");
    document.dispatchEvent(new CustomEvent("genyxo:map-card", { detail: { element: document.createElement("div"), data } }));
  }, card);
  const peek = page.locator(".gx-voice-stage .gx-voice-map");
  await expect(peek.locator(".gx-mapcard-row", { hasText: "Novus" })).toBeVisible();
  await page.evaluate(() => document.documentElement.removeAttribute("data-voice-mode"));
  await expect(peek).toHaveCount(0);
});
