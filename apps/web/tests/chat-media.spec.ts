import { readFileSync } from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

const IMAGE = "11111111-1111-4111-8111-111111111111";
const SPEECH = "22222222-2222-4222-8222-222222222222";
const VIDEO = "33333333-3333-4333-8333-333333333333";
const fence = "```";
const png = readFileSync(path.join(__dirname, "../public/images/plugins/xmind.png"));
/** One second of 8 kHz silence as a WAV file. */
function wav() {
  const pcm = Buffer.alloc(16000);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

test("generated images show inline, audio plays in a card and video appears when it finishes", async ({ page }) => {
  const reply = [
    "Here is your picture.",
    "",
    `![A ginger cat in a space helmet](/api/chat/media/${IMAGE})`,
    "",
    `${fence}genyxo-media`,
    JSON.stringify({ id: SPEECH, kind: "speech", status: "ready", title: "Привіт, я Genyxo!" }),
    fence,
    "",
    `${fence}genyxo-media`,
    JSON.stringify({ id: VIDEO, kind: "video", status: "pending", title: "Waves at sunset" }),
    fence,
  ].join("\n");
  let videoPolls = 0;
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, apiPath) => {
    if (apiPath === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (apiPath === "/chat/stream") {
      const events = [{ conversationId: 41 }, { status: "activity", step: "Generating image" }, ...(reply.match(/[\s\S]{1,40}/g) || []).map((token) => ({ token })), { status: "done", messageId: 501, creditBalance: 100 }];
      await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") });
      return true;
    }
    if (apiPath === `/chat/media/${IMAGE}`) { await route.fulfill({ body: png, contentType: "image/png" }); return true; }
    if (apiPath === `/chat/media/${SPEECH}`) { await route.fulfill({ body: wav(), contentType: "audio/wav" }); return true; }
    if (apiPath === `/chat/media/${VIDEO}/status`) { videoPolls += 1; await route.fulfill({ json: { id: VIDEO, kind: "video", status: videoPolls > 1 ? "ready" : "pending", mimeType: "video/mp4" } }); return true; }
    if (apiPath === `/chat/media/${VIDEO}`) { await route.fulfill({ status: 200, body: Buffer.alloc(0), contentType: "video/mp4" }); return true; }
    return false;
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#userInput").fill("Draw a ginger cat, voice a greeting and make a sunset video");
  await page.keyboard.press("Enter");

  const image = page.locator(`img[src="/api/chat/media/${IMAGE}"]`);
  await expect(image).toBeVisible();
  expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await image.evaluate((element) => getComputedStyle(element).borderRadius)).toBe("18px");

  const speech = page.locator('.gx-media-card[data-kind="speech"]');
  await expect(speech).toHaveAttribute("data-status", "ready");
  await expect(speech.locator(".gx-media-kind")).toHaveText("Voice-over");
  await expect(speech.locator("audio")).toHaveAttribute("src", `/api/chat/media/${SPEECH}`);
  await expect(speech.getByRole("link", { name: "Download" })).toHaveAttribute("href", `/api/chat/media/${SPEECH}`);

  const video = page.locator('.gx-media-card[data-kind="video"]');
  await expect(video).toHaveAttribute("data-status", "pending");
  await expect(video).toContainText("Rendering video");
  await page.screenshot({ path: "../../docs/design/chat-media.png", animations: "disabled" });
  await expect(video).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  await expect(video.locator("video")).toHaveAttribute("src", `/api/chat/media/${VIDEO}`);
});
