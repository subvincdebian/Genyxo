import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const here = { latitude: 50.4501, longitude: 30.5234 };
const places = [
  { id: "N1", name: "Novus", lat: 50.4497, lng: 30.5256, kind: "supermarket", distance: 160, address: "Khreshchatyk 22", openingHours: "08:00-23:00" },
  { id: "N2", name: "Fora", lat: 50.4466, lng: 30.5231, kind: "supermarket", distance: 390 },
];
const card = { type: "places", query: "supermarket", origin: { lat: here.latitude, lng: here.longitude }, radius: 1500, places };
const sse = (...events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

async function maps(page: Page, onStream: (body: Record<string, unknown>) => void) {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation(here);
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path.startsWith("/chat/maps/where")) { await route.fulfill({ json: { label: "Khreshchatyk 22", city: "Kyiv" } }); return true; }
    if (path.startsWith("/chat/maps/route")) { await route.fulfill({ json: { mode: "walking", distance: 420, duration: 330, geometry: [[30.5234, 50.4501], [30.5256, 50.4497]], steps: [] } }); return true; }
    if (path === "/chat/stream") {
      onStream(route.request().postDataJSON());
      await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ token: "Two supermarkets are close by.", conversationId: 41 }, { token: `\n\n\`\`\`genyxo-map\n${JSON.stringify(card)}\n\`\`\`\n\n`, conversationId: 41 }, { done: true, conversationId: 41 }) });
      return true;
    }
    return false;
  });
  await page.goto("/maps");
}

test("Maps asks for the location, opens a live map and sends questions with it", async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  await maps(page, (body) => bodies.push(body));
  await expect(page.locator(".gx-maps-head h1")).toHaveText("Maps");
  await expect(page.locator(".gx-maps-intro")).toBeVisible();
  await page.locator(".gx-maps-cta").click();
  await expect(page.locator(".gx-maps-map .gx-map")).toBeVisible();
  await expect(page.locator(".gx-maps-near")).toContainText("Khreshchatyk 22");
  await expect(page.locator(".gx-map-zoom button")).toHaveCount(2);

  await page.locator(".gx-maps-suggestions button", { hasText: "Supermarkets open now" }).click();
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual(expect.objectContaining({ message: "Supermarkets open now", location: expect.objectContaining({ lat: here.latitude, lng: here.longitude }) }));

  // The answer's map card lists the places in a glass panel.
  const answer = page.locator(".gx-mapcard");
  await expect(answer).toBeVisible();
  await expect(answer.locator(".gx-mapcard-row")).toHaveCount(2);
  await answer.locator(".gx-mapcard-row", { hasText: "Novus" }).click();
  await expect(answer.locator(".gx-mapcard-hours")).toHaveText("08:00-23:00");

  // Directions switch the panel to the route with travel modes.
  await answer.getByRole("button", { name: "Directions" }).click();
  await expect(answer.locator(".gx-mapcard-summary strong")).toHaveText("6 min");
  await expect(answer.getByRole("radio", { name: "Walk" })).toHaveAttribute("aria-checked", "true");
  // The camera frames the short walk closely instead of zooming out to the city.
  await expect.poll(async () => Number(await answer.locator(".gx-map-canvas").getAttribute("data-zoom"))).toBeGreaterThan(15);
  // Pins sit on the map, inside the card (MapLibre positions them).
  const cardBox = (await answer.boundingBox())!, pinBox = (await answer.locator(".gx-map-pin").first().boundingBox())!;
  expect(pinBox.x).toBeGreaterThan(cardBox.x + 300);
  await answer.getByRole("button", { name: "Back to the places" }).click();

  // "Ask Genyxo" puts the place into the composer; its address and coordinates go with the message.
  await expect(answer.locator(".gx-mapcard-row", { hasText: "Novus" })).toHaveAttribute("aria-expanded", "true");
  await answer.getByRole("button", { name: "Ask Genyxo" }).click();
  const input = page.locator("#userInput");
  await expect(input).toHaveValue("@Novus ");
  await expect(page.locator(".gx-tok", { hasText: "Novus" })).toBeVisible();
  await page.keyboard.type("is it open late?");
  await page.keyboard.press("Enter");
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[1]).toEqual(expect.objectContaining({
    message: "@Novus is it open late?",
    pinnedPlaces: [{ name: "Novus", lat: 50.4497, lng: 30.5256, address: "Khreshchatyk 22" }],
  }));
});

test("the Overview menu opens Maps", async ({ page }) => {
  await maps(page, () => undefined);
  await page.goto("/chat");
  await page.getByRole("button", { name: /overview/i }).first().click();
  await page.getByRole("menuitem", { name: "Maps" }).click();
  await expect(page).toHaveURL(/\/maps$/);
  await expect(page.locator(".gx-maps-head h1")).toHaveText("Maps");
});

test("while the model works, an orb names the current step", async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/stream") { await gate; await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ token: "Done.", conversationId: 7 }, { done: true, conversationId: 7 }) }); return true; }
    return false;
  });
  await page.goto("/chat");
  await page.locator("#userInput").fill("Find a pharmacy");
  await page.keyboard.press("Enter");
  const orb = page.locator(".gx-think-loader");
  await expect(orb.locator(".gx-think-label")).toHaveText("Thinking…");
  await expect(orb.locator("canvas")).toHaveCSS("opacity", "1");
  await page.evaluate(() => { (document.querySelector(".gx-think-loader")!.closest(".message") as HTMLElement).dataset.activity = "Searching the map"; });
  await expect(orb.locator(".gx-think-label")).toHaveText("Searching the map…");
  await expect(orb).toHaveAttribute("data-mood", "searching");
  release();
  await expect(orb).toHaveCount(0);
});
