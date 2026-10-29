import {
  chromium,
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { io } from "socket.io-client";

const backend = "http://localhost:3000";
const email = `settings-qa-${Date.now()}@example.test`;
const password = "Settings-QA-password-789";
const device = randomUUID();
const otherDevice = randomUUID();
const agent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36";
let token = "";
let userId = 0;
let mailId = "";
let chats: Array<{ id: number; publicId: string; title: string }> = [];
const headers = () => ({
  Authorization: `Bearer ${token}`,
  cookie: `genyxo_device=${device}`,
  "user-agent": agent,
});
function database(action: "seed" | "cleanup") {
  const source = `const mysql=require('mysql2/promise');const {randomUUID,createHash}=require('crypto');(async()=>{if(process.env.MYSQLHOST!=='mysql')throw Error('Local database only');const c=await mysql.createConnection({host:'mysql',user:process.env.MYSQLUSER,password:process.env.MYSQLPASSWORD,database:process.env.MYSQLDATABASE});try{const [users]=await c.execute('SELECT email FROM users WHERE id=?',[${userId}]);if(users[0]?.email!==${JSON.stringify(email)})throw Error('Fixture identity mismatch');${action === "seed" ? `for(let i=0;i<20;i++){const at=new Date(Date.now()-(i+1)*86400000);await c.execute('INSERT INTO auth_sessions (id,userId,deviceId,sessionVersion,userAgent,ip,createdAt,lastUsedAt,expiresAt,revokedAt) VALUES (?,?,NULL,0,?,?,?, ?,?,?)',[createHash('sha256').update('settings-qa-${userId}-'+i).digest('hex'),${userId},'Historical test browser','192.0.2.10',at,at,at,at]);}for(let i=0;i<9;i++)await c.execute('INSERT INTO conversation (userId,title,publicId,archivedAt,lastActivityAt) VALUES (?,?,?,?,?)',[${userId},'Settings chat '+(i+1),randomUUID(),i===8?new Date():null,new Date(Date.now()-i*1000)]);const [rows]=await c.execute('SELECT id,publicId,title FROM conversation WHERE userId=? ORDER BY lastActivityAt DESC',[${userId}]);console.log(JSON.stringify(rows));` : `await c.execute('DELETE FROM conversation WHERE userId=?',[${userId}]);await c.execute('DELETE FROM users WHERE id=?',[${userId}]);`} }finally{await c.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});`;
  const output = execFileSync(
    "docker",
    ["exec", "-i", "genyxo-backend-dev", "node"],
    { input: source, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
  if (action === "seed") chats = JSON.parse(output.trim());
}
async function login(request: APIRequestContext, identity: string) {
  const result = await request.post(`${backend}/auth/login`, {
    headers: { cookie: `genyxo_device=${identity}`, "user-agent": agent },
    data: { email, password },
  });
  expect(result.ok()).toBeTruthy();
  return (await result.json()).access_token as string;
}
test.describe.configure({ mode: "serial" });
test.beforeAll(async ({ request }) => {
  expect(
    (
      await request.post(`${backend}/auth/register`, {
        data: { name: "Settings QA", email, password },
      })
    ).ok(),
  ).toBeTruthy();
  await expect
    .poll(async () => {
      const data = await (
        await request.get("http://localhost:8025/api/v1/search", {
          params: { query: `to:${email}` },
        })
      ).json();
      return (mailId = data.messages?.[0]?.ID || "");
    })
    .not.toBe("");
  const message = await (
    await request.get(`http://localhost:8025/api/v1/message/${mailId}`)
  ).json();
  const verification = (message.HTML || message.Text).match(
    /token=([a-f0-9]+)/,
  )?.[1];
  const verified = await request.get(
    `${backend}/auth/verify?token=${verification}`,
    { maxRedirects: 0 },
  );
  token = new URL(verified.headers().location).hash.slice(
    "#auth-token=".length,
  );
  const user = await (
    await request.get(`${backend}/profile`, { headers: headers() })
  ).json();
  userId = user.id;
  database("seed");
});
test.afterAll(async ({ request }) => {
  if (userId) database("cleanup");
  if (mailId)
    await request.delete("http://localhost:8025/api/v1/messages", {
      data: { IDs: [mailId] },
    });
});
test.beforeEach(async ({ page, context }) => {
  await context.addCookies([
    { name: "genyxo_device", value: device, domain: "localhost", path: "/" },
  ]);
  await page.addInitScript((value) => {
    localStorage.setItem("authToken", value);
    localStorage.setItem("appLang", "en");
    localStorage.setItem("theme", "dark");
  }, token);
});

test("browser installation groups logins and revokes every token for only the selected device", async ({
  request,
  page,
}) => {
  const first = await login(request, otherDevice);
  const second = await login(request, otherDevice);
  const same = await login(request, device);
  const sessions = await (
    await request.get(`${backend}/profile/sessions`, { headers: headers() })
  ).json();
  expect(sessions).toHaveLength(2);
  const remote = sessions.find((row: { current: boolean }) => !row.current);
  await page.goto("/profile#security");
  await page
    .getByRole("button", { name: "Active sessions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Sign out", exact: true })
    .and(page.locator(":enabled"))
    .click();
  await expect
    .poll(async () =>
      (
        await request.get(`${backend}/profile`, {
          headers: { Authorization: `Bearer ${first}` },
        })
      ).status(),
    )
    .toBe(401);
  expect(
    (
      await request.get(`${backend}/profile`, {
        headers: { Authorization: `Bearer ${second}` },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.get(`${backend}/profile`, {
        headers: { Authorization: `Bearer ${same}` },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post(`${backend}/profile/sessions/${remote.id}/revoke`, {
        headers: headers(),
      })
    ).ok(),
  ).toBeTruthy();
});

test("history is owner scoped, cursor paginated in pages of fifteen and loads more on scroll", async ({
  page,
  request,
}) => {
  const first = await (
    await request.get(`${backend}/profile/security-history`, {
      headers: headers(),
    })
  ).json();
  expect(first.items).toHaveLength(15);
  expect(first.nextCursor).toBeTruthy();
  const next = await (
    await request.get(
      `${backend}/profile/security-history?cursor=${first.nextCursor}`,
      { headers: headers() },
    )
  ).json();
  expect(next.items.length).toBeGreaterThan(0);
  expect(
    new Set([...first.items, ...next.items].map((row) => row.id)).size,
  ).toBe(first.items.length + next.items.length);
  expect(
    (
      await request.get(`${backend}/profile/security-history?cursor=invalid`, {
        headers: headers(),
      })
    ).status(),
  ).toBe(400);
  await page.goto("/profile#security");
  await page
    .getByRole("button", { name: "Security history", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Back", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByText("Signed in to Genyxo", { exact: true }),
  ).toHaveCount(15);
  await page
    .getByText("Signed in to Genyxo", { exact: true })
    .last()
    .scrollIntoViewIfNeeded();
  await expect
    .poll(() => page.getByText("Signed in to Genyxo", { exact: true }).count())
    .toBeGreaterThan(15);
});

test("archived chats use the real archive state and restore to the chat list", async ({
  page,
  request,
}) => {
  await page.goto("/profile#archive");
  const archived = page.getByRole("link", {
    name: "Settings chat 9",
    exact: true,
  });
  await expect(archived).toBeVisible();
  await expect(archived).toHaveAttribute("href", `/c/${chats[8].publicId}`);
  await page.getByRole("button", { name: "Restore chat", exact: true }).click();
  await expect(archived).toHaveCount(0);
  const list = await (
    await request.get(`${backend}/chat/workspace/conversations?limit=15`, {
      headers: headers(),
    })
  ).json();
  expect(
    list.items.some((item: { id: number }) => item.id === chats[8].id),
  ).toBe(true);
});

test("saved interaction settings notify the authenticated account in real time", async ({
  request,
}) => {
  const socket = io(`${backend}/notifications`, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Socket connection timed out")),
        15000,
      );
      socket.once("connect", () => {
        clearTimeout(timer);
        resolve();
      });
      socket.once("connect_error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const notification = new Promise<{
      userId: number;
      settings: { callLanguage: string };
    }>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Settings notification timed out")),
        15000,
      );
      socket.once("interaction_settings", (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
    expect(
      (
        await request.post(`${backend}/profile/interaction-settings`, {
          headers: headers(),
          data: { callLanguage: "en" },
        })
      ).ok(),
    ).toBeTruthy();
    expect(await notification).toMatchObject({
      userId,
      settings: { callLanguage: "en" },
    });
  } finally {
    socket.disconnect();
  }
});

test("voice and keyboard changes persist in MySQL and remapped shortcuts run in the chat", async ({
  page,
  request,
}) => {
  await page.goto("/profile#voice");
  await page
    .getByRole("combobox", { name: "Voice call language", exact: true })
    .click();
  await expect(page.getByRole("option", { name: /Рус/ })).toHaveCount(0);
  await page.getByRole("option", { name: "Українська", exact: true }).click();
  await page.getByRole("button", { name: /Kore/ }).click();
  await page.getByRole("button", { name: /Aoede/ }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("switch", { name: "Enable dictation", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`${backend}/profile/interaction-settings`, {
              headers: headers(),
            })
          ).json()
        ).voice,
    )
    .toBe("Aoede");
  await page.getByRole("link", { name: "Keyboard", exact: true }).click();
  const remap = page.getByRole("button", {
    name: "Change shortcut for Search chats",
    exact: true,
  });
  await remap.click();
  await remap.press("Control+Shift+f");
  await expect(remap).toContainText("F");
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(`${backend}/profile/interaction-settings`, {
              headers: headers(),
            })
          ).json()
        ).shortcuts?.search?.binding,
    )
    .toBe("Ctrl+Shift+KeyF");
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeVisible();
  await expect(page.locator("#voiceBtn")).toBeHidden();
  await page.keyboard.press("Control+Shift+f");
  await expect(page.getByRole("dialog", { name: /Search/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Search/ })).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Settings chat 2", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Alt+2");
  await expect(page).toHaveURL(new RegExp(`/c/${chats[1].publicId}`));
  await page.keyboard.press("Control+/");
  await expect(
    page.getByRole("dialog", { name: "Keyboard", exact: true }),
  ).toBeVisible();
});

test("synthetic microphone test meters audio and releases capture on stop and navigation", async ({
  request,
}) => {
  const audioBrowser = await chromium.launch({
    args: [
      "--use-fake-device-for-media-stream",
      "--use-fake-ui-for-media-stream",
      "--mute-audio",
    ],
  });
  const context = await audioBrowser.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    permissions: ["microphone"],
  });
  const page = await context.newPage();
  await page.addInitScript((value) => {
    localStorage.setItem("authToken", value);
    localStorage.setItem("appLang", "en");
    const tracks: MediaStreamTrack[] = [];
    Object.assign(window, { qaTracks: tracks });
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      tracks.push(...stream.getTracks());
      return stream;
    };
  }, token);
  await page.goto("/profile#voice");
  await page.getByRole("button", { name: "Mic test", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop testing", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.getByRole("meter").getAttribute("aria-valuenow"))
    .not.toBe("0");
  await page.getByRole("button", { name: "Stop testing", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { qaTracks: MediaStreamTrack[] }).qaTracks.every(
          (track) => track.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Mic test", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Stop testing", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Keyboard", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { qaTracks: MediaStreamTrack[] }).qaTracks.every(
          (track) => track.readyState === "ended",
        ),
      ),
    )
    .toBe(true);
  expect(
    (
      await request.post(`${backend}/profile/interaction-settings`, {
        headers: headers(),
        data: { callLanguage: "ru" },
      })
    ).status(),
  ).toBe(400);
  await audioBrowser.close();
});
