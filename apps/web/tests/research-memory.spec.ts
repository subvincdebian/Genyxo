import { expect, test, type Page } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const sse = (...events: object[]) => events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
const sources = [
  { title: "C++26 - cppreference.com", url: "https://en.cppreference.com/cpp/26" },
  { title: "Standard C++ status", url: "https://isocpp.org/std/status" },
];
const report = `# C++26 status\n\n**TL;DR** The standard is feature-complete [1](https://en.cppreference.com/cpp/26) and in final review [2](https://isocpp.org/std/status).\n\n\`\`\`genyxo-sources\n${JSON.stringify({ sources })}\n\`\`\`\n`;

async function setup(page: Page, options: { onStream?: (body: Record<string, unknown>) => void; reply?: string; gate?: Promise<void> } = {}) {
  const memories = [{ id: 3, content: "Lives in Kyiv" }];
  let preferences = { memory: true };
  const calls: string[] = [];
  await authenticate(page);
  await mockApi(page, async (route, path) => {
    const method = route.request().method();
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path === "/chat/workspace/memory" && method === "GET") { await route.fulfill({ json: { items: memories } }); return true; }
    if (path === "/chat/workspace/memory" && method === "POST") { const body = route.request().postDataJSON(); memories.unshift({ id: 9, content: body.content }); calls.push(`add:${body.content}`); await route.fulfill({ json: memories[0] }); return true; }
    if (path.startsWith("/chat/workspace/memory/") && method === "DELETE") { const id = Number(path.split("/").pop()); memories.splice(memories.findIndex((item) => item.id === id), 1); calls.push(`delete:${id}`); await route.fulfill({ json: { success: true } }); return true; }
    if (path === "/chat/workspace/preferences" && method === "GET") { await route.fulfill({ json: { ...preferences, timezone: "UTC", timezoneInitialized: true } }); return true; }
    if (path === "/chat/workspace/preferences" && method === "PATCH") { preferences = { ...preferences, ...route.request().postDataJSON() }; calls.push(`memory:${preferences.memory}`); await route.fulfill({ json: preferences }); return true; }
    if (path === "/chat/stream") {
      options.onStream?.(route.request().postDataJSON());
      if (options.gate) await options.gate;
      await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse({ token: options.reply ?? report, conversationId: 5 }, { done: true, conversationId: 5 }) });
      return true;
    }
    return false;
  });
  await page.goto("/chat");
  return calls;
}

test("the + menu offers Web search and Deep research as ChatGPT-style mode chips", async ({ page }) => {
  const bodies: Record<string, unknown>[] = [];
  await setup(page, { onStream: (body) => bodies.push(body) });
  const input = page.locator("#userInput");
  await page.locator("#plusBtn").click();
  const palette = page.locator(".gx-cp");
  await expect(palette.locator(".gx-cp-row", { hasText: "Web search" })).toBeVisible();
  await palette.locator(".gx-cp-row", { hasText: "Deep research" }).click();

  const chip = page.locator(".gx-mode-chip");
  await expect(chip).toHaveAttribute("data-mode", "research");
  await expect(input).toHaveAttribute("placeholder", "What should I research?");
  // Backspace in an empty composer removes the chip; "/" brings Web search back.
  await input.click();
  await page.keyboard.press("Backspace");
  await expect(chip).toHaveCount(0);
  await page.keyboard.type("/search");
  await page.keyboard.press("Enter");
  await expect(chip).toHaveAttribute("data-mode", "search");

  await input.fill("Is C++26 out?");
  await page.keyboard.press("Enter");
  await expect.poll(() => bodies.length).toBe(1);
  expect(bodies[0]).toEqual(expect.objectContaining({ message: "Is C++26 out?", mode: "search" }));
  await expect(chip).toHaveCount(0);

  // The answer lists its sources and turns numbered links into citation pills.
  const sourcesCard = page.locator(".gx-src");
  await expect(sourcesCard.locator(".gx-src-count")).toHaveText("2");
  await expect(page.locator("#chatBox a.gx-cite").first()).toHaveText("cppreference");
  await expect(page.locator("#chatBox a.gx-cite").nth(1)).toHaveText("isocpp");
  await sourcesCard.getByRole("button", { name: /Sources/ }).click();
  await expect(sourcesCard.locator(".gx-src-list li")).toHaveCount(2);
  await expect(sourcesCard.locator(".gx-src-list a").nth(1)).toHaveAttribute("href", "https://isocpp.org/std/status");
});

test("Deep research lists each step under the orb while it works", async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await setup(page, { gate });
  await page.locator("#userInput").fill("Research C++26");
  await page.keyboard.press("Enter");
  const orb = page.locator(".gx-think-loader");
  await expect(orb).toBeVisible();
  for (const step of ["Planning the research", "Searching “C++26 status”", "Reading isocpp.org", "Writing the report"]) {
    await page.evaluate((value) => { (document.querySelector(".gx-think-loader")!.closest(".message") as HTMLElement).dataset.activity = value; }, step);
    await expect(orb.locator(".gx-think-label")).toHaveText(`${step}…`);
  }
  const steps = page.locator(".gx-think-steps li");
  await expect(steps).toHaveCount(4);
  await expect(steps.last()).toHaveClass("is-current");
  await expect(steps.first()).toHaveClass("is-done");
  await expect(orb).toHaveAttribute("data-mood", "creating");
  release();
  await expect(page.locator("#chatBox h1")).toHaveText("C++26 status");
});

test("Memory updated opens Settings → Memory, where facts can be added, turned off and forgotten", async ({ page }) => {
  const calls = await setup(page, { reply: `Got it, you code in C++.\n\n\`\`\`genyxo-memory\n${JSON.stringify({ action: "saved", fact: "Writes C++ in CLion" })}\n\`\`\`\n` });
  await page.locator("#userInput").fill("I write C++ in CLion");
  await page.keyboard.press("Enter");
  const pill = page.locator(".gx-memory-pill");
  await expect(pill).toContainText("Memory updated");
  await expect(pill).toHaveAttribute("title", "Writes C++ in CLion");
  await pill.click();

  const dialog = page.getByRole("dialog", { name: "Memory" });
  const facts = dialog.locator(".gx-memory-list li:has(button[aria-label^='Forget'])");
  await expect(facts).toHaveCount(1);
  await dialog.getByLabel("Add a memory").fill("Prefers short answers");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(facts.first()).toContainText("Prefers short answers");
  await dialog.getByRole("button", { name: "Forget: Lives in Kyiv" }).click();
  await expect(facts).toHaveCount(1);
  await dialog.getByRole("switch", { name: /Reference saved memories/ }).click();
  await expect(dialog.getByRole("switch", { name: /Reference saved memories/ })).toHaveAttribute("aria-checked", "false");
  expect(calls).toEqual(["add:Prefers short answers", "delete:3", "memory:false"]);
});

test("Settings in the sidebar opens Memory", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: /settings/i }).first().click();
  await page.getByRole("menuitem", { name: "Memory" }).click();
  await expect(page.getByRole("dialog", { name: "Memory" })).toBeVisible();
});
