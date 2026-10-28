import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { spacingCaptureScript } from "./spacing-capture";

// A disposable local account and real MySQL ledger. No API routes are mocked.
const email = `profile-qa-${Date.now()}@example.test`;
let password = "Profile-QA-password-789";
let userId = 0;
let mailId = "";
let sharedToken = "";
const backend = "http://localhost:3000";

function database(action: "seed" | "cleanup") {
  const script = `const mysql=require('mysql2/promise'); (async()=>{if(process.env.MYSQLHOST!=='mysql')throw Error('Local database only'); const c=await mysql.createConnection({host:'mysql',user:process.env.MYSQLUSER,password:process.env.MYSQLPASSWORD,database:process.env.MYSQLDATABASE});try{const [u]=await c.execute('SELECT email FROM users WHERE id=?',[${userId}]);if(u[0]?.email!==${JSON.stringify(email)})throw Error('Account identity mismatch');${action === "seed" ? `await c.execute('UPDATE users SET credits=1992.25 WHERE id=?',[${userId}]);for(let i=0;i<11;i++)await c.execute("INSERT INTO transactions (userId,amount,creditsAmount,status,type,description,provider,createdAt) VALUES (?,9.99,?, 'APPROVED','PURCHASE','QA credit purchase','INTERNAL',UTC_TIMESTAMP())",[${userId},i===0?1000:100]);for(const [amount,days] of [[-0.25,0],[-0.5,1],[-7,100]])await c.execute("INSERT INTO transactions (userId,amount,creditsAmount,status,type,description,provider,createdAt) VALUES (?,0,?,'APPROVED','SPEND','AI: QA model','INTERNAL',DATE_SUB(UTC_TIMESTAMP(),INTERVAL ? DAY))",[${userId},amount,days]);` : `for(const table of ['chat_workspace_records','transactions','notifications'])await c.execute('DELETE FROM '+table+' WHERE userId=?',[${userId}]);await c.execute('DELETE FROM users WHERE id=? AND email=?',[${userId},${JSON.stringify(email)}]);`}}finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1})`;
  execFileSync("docker", ["exec", "genyxo-backend-dev", "node", "-e", script], {
    stdio: "pipe",
  });
}
async function login(request: APIRequestContext) {
  const response = await request.post(`${backend}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}
async function signIn(page: Page, request: APIRequestContext) {
  // Reuse the fixture session; unnecessary logins would hit the real rate limit
  // when the production build completes the suite faster than the dev server.
  const account = sharedToken
    ? { access_token: sharedToken }
    : await login(request);
  sharedToken = account.access_token;
  await page.goto("/profile");
  await page.evaluate((token) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("theme", "dark");
  }, account.access_token);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Edit name", exact: true }),
  ).toBeVisible();
  return account.access_token as string;
}
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => {
  const response = await request.post(`${backend}/auth/register`, {
    data: { name: "Profile QA", email, password },
  });
  expect(response.ok()).toBeTruthy();
  await expect
    .poll(async () => {
      const result = await request.get("http://localhost:8025/api/v1/search", {
        params: { query: `to:${email}` },
      });
      const data = await result.json();
      mailId = data.messages?.[0]?.ID || "";
      return mailId;
    })
    .not.toBe("");
  const message = await (
    await request.get(`http://localhost:8025/api/v1/message/${mailId}`)
  ).json();
  const token = (message.HTML || message.Text).match(/token=([a-f0-9]+)/)?.[1];
  expect(token).toBeTruthy();
  const verify = await request.get(`${backend}/auth/verify?token=${token}`, {
    maxRedirects: 0,
  });
  expect(verify.status()).toBe(302);
  const account = await login(request);
  userId = account.user.id;
  sharedToken = account.access_token;
  database("seed");
});
test.afterAll(async ({ request }) => {
  if (userId) database("cleanup");
  if (mailId)
    await request.delete("http://localhost:8025/api/v1/messages", {
      data: { IDs: [mailId] },
    });
});

test("profile edits and uploaded avatars persist in the database", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  await page.getByRole("button", { name: "Edit name", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Email address")).toHaveCount(0);
  await expect(dialog.getByLabel("Upload photo", { exact: true })).toHaveCount(
    0,
  );
  await dialog.getByLabel("Display name").fill("Profile QA Updated");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Profile QA Updated" }),
  ).toBeVisible();
  // Avatar activation opens the native picker directly, then previews the chosen image.
  await expect(page.getByText("Account ID", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Personal account", { exact: true })).toHaveCount(
    0,
  );
  const picker = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload photo", exact: true }).click();
  await (
    await picker
  ).setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jK1kAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Profile menu" }).click();
  await expect(page.getByRole("menu")).toBeVisible();
  await expect(
    page.getByRole("menuitem", { name: "Profile", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Notifications", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Profile menu" }),
  ).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 550 });
  const sidebar = page.getByRole("complementary");
  await sidebar
    .getByRole("link", { name: "Help & support" })
    .scrollIntoViewIfNeeded();
  expect(
    await sidebar.evaluate((el) => el.getBoundingClientRect().bottom),
  ).toBeLessThanOrEqual(551);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = await (
    await request.get(`${backend}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  expect(profile.name).toBe("Profile QA Updated");
  expect(profile.avatar).toMatch(/^data:image\/webp;base64,/);
});

test("personalization persists and unsaved navigation preserves the draft", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  await page
    .getByRole("link", { name: "Personalization", exact: true })
    .click();
  await page
    .getByLabel("Custom instructions", { exact: true })
    .fill("Use practical examples and short paragraphs.");
  await page
    .getByLabel("Response language", { exact: true })
    .selectOption("uk");
  await page.getByRole("switch", { name: "Use saved memories" }).click();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await page.reload();
  await expect(
    page.getByLabel("Custom instructions", { exact: true }),
  ).toHaveValue("Use practical examples and short paragraphs.");
  const preferences = await (
    await request.get(`${backend}/chat/workspace/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  expect(preferences).toMatchObject({
    memory: false,
    responseLanguage: "uk",
    customInstructions: "Use practical examples and short paragraphs.",
  });
  await page
    .getByLabel("Custom instructions", { exact: true })
    .fill("Unsaved draft");
  await page.getByRole("link", { name: "Security", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep editing" })
    .click();
  await expect(
    page.getByLabel("Custom instructions", { exact: true }),
  ).toHaveValue("Unsaved draft");
  await page.getByRole("link", { name: "Security", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard changes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Security", exact: true }),
  ).toBeVisible();
});

test("fractional usage, filtering and pagination reflect the real ledger", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  const headers = { Authorization: `Bearer ${token}` };
  const usage = await (
    await request.get(`${backend}/profile/usage?period=30`, { headers })
  ).json();
  expect(usage.totalCredits).toBe(0.75);
  expect(usage.requests).toBe(2);
  expect(usage.days).toHaveLength(30);
  await page
    .getByRole("link", { name: "Credits & billing", exact: true })
    .click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(10);
  await page.getByLabel("Filter transactions").selectOption("PURCHASE");
  await expect(
    page.getByText("11 transactions", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByRole("table").locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Usage", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("0.75");
  await page.getByRole("button", { name: "7d", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "7d", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /genyxo-usage-.*-7d.csv/,
  );
  expect(
    (
      await request.get(`${backend}/profile/usage?period=1`, { headers })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(`${backend}/profile/transactions?page=1.5`, { headers })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.get(`${backend}/profile/transactions?type=INVALID`, {
        headers,
      })
    ).status(),
  ).toBe(400);
  expect((await request.get(`${backend}/profile/usage`)).status()).toBe(401);
});

test("real errors preserve drafts and retry saves them", async ({
  page,
  request,
}) => {
  await signIn(page, request);
  await page
    .getByRole("link", { name: "Personalization", exact: true })
    .click();
  await page
    .getByLabel("Custom instructions", { exact: true })
    .fill("Offline draft retained");
  await page.context().setOffline(true);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
  await expect(
    page.getByLabel("Custom instructions", { exact: true }),
  ).toHaveValue("Offline draft retained");
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
});

test("mobile, light theme, reduced motion and all sections remain usable", async ({
  page,
  request,
}, testInfo) => {
  await signIn(page, request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const section of [
    "profile",
    "personalization",
    "appearance",
    "security",
    "billing",
    "usage",
    "referrals",
  ]) {
    await page.getByLabel("Settings", { exact: true }).selectOption(section);
    await expect(page.locator("main h1")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  }
  await page.getByLabel("Settings", { exact: true }).selectOption("appearance");
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Interface language").selectOption("uk");
  await expect(page.locator("html")).toHaveAttribute("lang", "uk");
  await expect(page.locator("main h1")).toHaveText("Зовнішній вигляд");
  await page.getByLabel("Мова інтерфейсу").selectOption("en");
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.getByLabel("Settings", { exact: true }).selectOption("profile");
  await expect(
    page.getByRole("button", { name: /AI requests · 30 days/ }),
  ).toContainText("2");
  const states = [];
  for (const width of [390, 1440, 1728]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath(`profile-${width}.png`),
      fullPage: true,
    });
    states.push(await page.evaluate(spacingCaptureScript));
  }
  writeFileSync(
    testInfo.outputPath("spacing-states.json"),
    JSON.stringify(states),
  );
  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await page.getByRole("radio", { name: "Light", exact: true }).check();
  await page.screenshot({
    path: testInfo.outputPath("appearance-light.png"),
    fullPage: true,
  });
  await page.getByRole("radio", { name: "Dark", exact: true }).check();
  await page.getByRole("link", { name: "Usage", exact: true }).click();
  await expect(page.getByRole("main")).toContainText("0.75");
  await page.screenshot({
    path: testInfo.outputPath("usage-desktop.png"),
    fullPage: true,
  });
});

test("all public navbar routes use the same account menu without pointer rings", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  const profile = await (
    await request.get(`${backend}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  await page.evaluate((account) => {
    for (const [key, value] of Object.entries({
      userName: account.name,
      userEmail: account.email,
      userAvatar: account.avatar,
      userCredits: String(account.credits),
      userRole: account.role,
    }))
      localStorage.setItem(key, String(value || ""));
    document.dispatchEvent(new Event("genyxo:session"));
  }, profile);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of [
    "/",
    "/chat",
    "/support",
    "/policies/faq",
    "/policies/policies",
    "/policies/privacy-policy",
    "/policies/terms-of-service",
    "/notifications",
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const avatar = page.getByRole("button", {
      name: "Profile menu",
      exact: true,
    });
    await expect(avatar).toBeEnabled();
    await avatar.click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Profile", exact: true }),
    ).toBeVisible();
    await expect(
      menu.getByRole("menuitem", { name: "Sign out", exact: true }),
    ).toBeVisible();
    expect(
      await avatar.evaluate((button) => getComputedStyle(button).boxShadow),
    ).toBe("none");
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("sign out everywhere revokes independently issued sessions", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  const second = (await login(request)).access_token;
  await page.getByRole("link", { name: "Security", exact: true }).click();
  await page
    .getByRole("button", { name: "Sign out all devices", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sign out all devices", exact: true })
    .click();
  await expect(page).toHaveURL(/\/sign-in/);
  sharedToken = "";
  for (const value of [token, second])
    expect(
      (
        await request.get(`${backend}/profile`, {
          headers: { Authorization: `Bearer ${value}` },
        })
      ).status(),
    ).toBe(401);
});

test("changing a password verifies the current password and revokes old sessions", async ({
  page,
  request,
}) => {
  const token = await signIn(page, request);
  const headers = { Authorization: `Bearer ${token}` };
  expect(
    (
      await request.post(`${backend}/profile/password`, {
        headers,
        data: {
          currentPassword: "incorrect",
          newPassword: "New-QA-password-456",
        },
      })
    ).status(),
  ).toBe(400);
  await page.getByRole("link", { name: "Security", exact: true }).click();
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current password", { exact: true }).fill(password);
  await dialog
    .getByLabel("New password", { exact: true })
    .fill("New-QA-password-456");
  await dialog
    .getByLabel("Confirm new password", { exact: true })
    .fill("New-QA-password-456");
  await dialog.getByRole("button", { name: "Change password" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  expect(
    (
      await request.post(`${backend}/auth/login`, { data: { email, password } })
    ).status(),
  ).toBe(401);
  password = "New-QA-password-456";
  await login(request);
  expect((await request.get(`${backend}/profile`, { headers })).status()).toBe(
    401,
  );
});
