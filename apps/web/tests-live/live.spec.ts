import { expect, test, type Page } from "@playwright/test";

const email = process.env.GX_LIVE_EMAIL;
const password = process.env.GX_LIVE_PASSWORD;
const backend = process.env.GX_LIVE_BACKEND || "http://localhost:3000";
// A model the OpenRouter free tier serves today; override when the catalog changes.
const model = process.env.GX_LIVE_MODEL || "google/gemma-4-31b-it:free";

test.skip(!email || !password, "Set GX_LIVE_EMAIL and GX_LIVE_PASSWORD for a verified local account.");

async function signIn(page: Page) {
  const response = await fetch(`${backend}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  expect(response.ok, "login against the local backend").toBe(true);
  const { access_token: token } = await response.json();
  await page.goto("/sign-in");
  await page.evaluate((value) => localStorage.setItem("authToken", value), token);
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.evaluate((value) => {
    const select = document.getElementById("modelSelect") as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event("change"));
  }, model);
  await expect(page.locator("#modelSelect")).toHaveValue(model);
}

async function ask(page: Page, prompt: string) {
  await page.locator("#userInput").fill(prompt);
  await page.keyboard.press("Enter");
  await expect(page.locator("#stopBtn")).toBeVisible();
  await expect(page.locator("#stopBtn")).toBeHidden({ timeout: 150000 });
  const answer = page.locator("#chatBox .bot-message").last();
  await expect(answer.locator(".gx-stopped")).toHaveCount(0);
  await expect(answer).not.toContainText("Error:");
  return answer;
}

test("a real model streams an answer into a saved conversation", async ({ page }) => {
  await signIn(page);
  const answer = await ask(page, "Reply with exactly three short bullet points about why one credit balance for many AI models is useful.");
  await expect.poll(async () => (await answer.locator(".message-content").innerText()).trim().length).toBeGreaterThan(20);
  await expect(page).toHaveURL(/[?&]id=\d+/);
  await expect(page.locator(".ws-sidebar-recent .ws-chat-row").first()).toBeVisible();
});

test("a real HTML answer opens in the canvas and renders", async ({ page }) => {
  await signIn(page);
  await ask(page, "Create a single self-contained HTML page (at least 20 lines, inline CSS) with an <h1> that says Genyxo Live and a button. Return only one ```html code block.");
  await expect(page.locator(".gx-canvas")).toHaveClass(/is-open/, { timeout: 15000 });
  await expect(page.frameLocator(".gx-canvas iframe").locator("h1")).toContainText(/Genyxo Live/i);
});

test("a failing model keeps the question in place, saves nothing and Retry recovers", async ({ page }) => {
  await signIn(page);
  const before = await page.evaluate(async () => (await (await fetch("/api/chat/workspace", { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } })).json()).conversations.length);
  // A catalog entry OpenRouter no longer serves: the request fails before any answer.
  await page.evaluate((value) => {
    const select = document.getElementById("modelSelect") as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event("change"));
  }, process.env.GX_LIVE_FAILING_MODEL || "openai/gpt-oss-120b:free");
  await page.locator("#userInput").fill("Name three colors.");
  await page.keyboard.press("Enter");
  const error = page.locator(".gx-turn-error");
  await expect(error).toBeVisible({ timeout: 60000 });
  await expect(page.locator("#chatBox .user-message")).toHaveCount(1);
  await expect(page).not.toHaveURL(/[?&]id=\d+/);
  const after = await page.evaluate(async () => (await (await fetch("/api/chat/workspace", { headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } })).json()).conversations.length);
  expect(after).toBe(before);

  await page.evaluate((value) => {
    const select = document.getElementById("modelSelect") as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event("change"));
  }, model);
  await error.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator("#stopBtn")).toBeHidden({ timeout: 150000 });
  await expect.poll(async () => (await page.locator("#chatBox .bot-message").last().innerText()).trim().length, { timeout: 60000 }).toBeGreaterThan(3);
  await expect(page.locator("#chatBox .user-message")).toHaveCount(1);
  await expect(page).toHaveURL(/[?&]id=\d+/);
});

test("stopping a real answer keeps the composer usable", async ({ page }) => {
  await signIn(page);
  await page.locator("#userInput").fill("Write a 1500-word story about the sea.");
  await page.keyboard.press("Enter");
  await expect(page.locator("#stopBtn")).toBeVisible();
  await page.locator("#stopBtn").click();
  await expect(page.locator("#stopBtn")).toBeHidden();
  await expect(page.locator("#userInput")).toBeEnabled();
});
