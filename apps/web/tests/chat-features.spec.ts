import { expect, test, type Page } from "@playwright/test";
import { authenticate, chatKey, mockApi } from "./fixtures";

const fence = "```";
const html = [
  "<!doctype html>",
  "<html>",
  "<head><title>Pricing card</title></head>",
  "<body>",
  "  <main>",
  "    <h1 id=\"title\">Genyxo Pro</h1>",
  "    <p>All models, one balance.</p>",
  "    <button id=\"buy\">Buy</button>",
  "  </main>",
  "  <script>",
  "    console.log('preview ready');",
  "  </script>",
  "</body>",
  "</html>",
].join("\n");
const answer = `Here is the card.\n\n${fence}html\n${html}\n${fence}\n\nIt is responsive.`;

function sse(text: string, extra: Record<string, unknown> = {}) {
  const events = [{ conversationId: 41, messageId: 501, ...extra }, ...(text.match(/[\s\S]{1,24}/g) || []).map((token) => ({ token })), { status: "done", creditBalance: 140 }];
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

async function workspace(page: Page, stream?: (route: import("@playwright/test").Route) => Promise<void> | void) {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") { await route.fulfill({ json: { conversations: [], projects: [{ id: 3, name: "Launch plan", pinnedAt: null }], preferences: { timezone: "UTC", timezoneInitialized: true }, capabilities: {} } }); return true; }
    if (path.startsWith("/chat/workspace/library")) { await route.fulfill({ json: { items: [{ id: 9, name: "Brief.md", type: "document", content: "# Brief\nShip it." }], folders: [], hasMore: false } }); return true; }
    if (path === "/chat/workspace/presets") { await route.fulfill({ json: { items: [{ id: 5, name: "Copy editor", description: "Tightens prose" }] } }); return true; }
    if (path === "/integrations") { await route.fulfill({ json: { categories: [], encryptionAvailable: true, plugins: [{ id: "github", name: "GitHub", description: "Repositories and issues", status: "connected" }, { id: "notion", name: "Notion", description: "Pages", status: "available" }] } }); return true; }
    if (path === "/chat/stream" && stream) { await stream(route); return true; }
    return false;
  });
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
}

test("streamed answer opens a previewable artifact in the canvas", async ({ page }) => {
  await workspace(page, (route) => route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse(answer) }));
  await page.locator("#userInput").fill("Make a pricing card");
  await page.keyboard.press("Enter");

  await expect(page.locator(".gx-canvas")).toHaveClass(/is-open/);
  await expect(page.locator(".gx-canvas-card")).toContainText("HTML page");
  const preview = page.frameLocator(".gx-canvas iframe");
  await expect(preview.locator("#title")).toHaveText("Genyxo Pro");

  await page.locator(".gx-canvas-tabs [role=tab]").nth(1).click();
  await page.locator(".gx-canvas-editor textarea").fill(html.replace("Genyxo Pro", "Edited live"));
  await page.locator(".gx-canvas-tabs [role=tab]").nth(0).click();
  await expect(preview.locator("#title")).toHaveText("Edited live");
  await page.locator(".gx-canvas-console-toggle").click();
  await expect(page.locator(".gx-canvas-log")).toContainText("preview ready");

  await page.keyboard.press("Escape");
  await expect(page.locator(".gx-canvas")).not.toHaveClass(/is-open/);
  await page.locator(".gx-canvas-card").click();
  await expect(page.locator(".gx-canvas")).toHaveClass(/is-open/);
});

test("files from the assistant appear as cards that open, expand and download", async ({ page }) => {
  const reply = `Here are both files.

${fence}python file=calc.py
def add(a, b):
    return a + b
${fence}
${fence}markdown file=README.md
# Calc
Adds numbers.
${fence}

Done.`;
  let payload: Record<string, unknown> = {};
  await workspace(page, (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse(reply) });
  });
  await page.locator("#userInput").fill("Make a calculator file");
  await page.keyboard.press("Enter");

  const cards = page.locator(".gx-file-stack .gx-file-card");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).locator("strong")).toHaveText("calc.py");
  await expect(cards.nth(0).locator("small")).toContainText("Python · 2 lines");
  await expect(cards.nth(1).locator("strong")).toHaveText("README.md");
  expect(payload.voice).toBeUndefined();
  expect(Array.isArray(payload.locales)).toBe(true);

  await cards.nth(0).getByRole("button", { name: "Show code" }).click();
  await expect(cards.nth(0)).toHaveClass(/is-open/);
  await expect(cards.nth(0).locator("pre")).toContainText("return a + b");
  const download = page.waitForEvent("download");
  await cards.nth(0).getByRole("button", { name: "Download calc.py" }).click();
  expect((await download).suggestedFilename()).toBe("calc.py");
  await cards.nth(1).getByRole("button", { name: "Open" }).click();
  await expect(page.locator(".gx-canvas")).toHaveClass(/is-open/);
});

test("a streaming answer can be stopped with the button or Escape", async ({ page }) => {
  await workspace(page, () => { /* Keep the stream open until the client aborts it. */ });
  await page.locator("#userInput").fill("Write a long story");
  await page.keyboard.press("Enter");
  await expect(page.locator("#stopBtn")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".gx-stopped")).toHaveText("Response stopped.");
  await expect(page.locator("#stopBtn")).toBeHidden();
  await expect(page.locator("#userInput")).toBeEnabled();
});

test("a failed first answer stays in the chat with Retry and leaves no empty chat", async ({ page }) => {
  const bodies: string[] = [];
  let calls = 0;
  await workspace(page, async (route) => {
    calls += 1;
    bodies.push(route.request().postData() || "");
    // First attempt: the server opens a chat, the model fails, the server rolls the chat back.
    const failure = [{ status: "conversation", conversationId: 77, conversationTitle: "New chat" }, { error: "429 Provider returned error", conversationId: null, rolledBack: true }]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: calls === 1 ? failure : sse("Here is the answer.") });
  });
  await page.locator("#userInput").fill("Explain credits");
  await page.keyboard.press("Enter");

  const error = page.locator(".gx-turn-error");
  await expect(error).toBeVisible();
  await expect(error).toContainText("The model is busy right now");
  await expect(page.locator("#chatBox .user-message")).toHaveCount(1);
  await expect(page.locator("#chatBox .user-message")).toContainText("Explain credits");
  await expect(page).not.toHaveURL(/[?&]id=77/);
  await expect(page.locator("#userInput")).toHaveValue("");

  await error.getByRole("button", { name: "Retry" }).click();
  await expect(page.locator("#chatBox .bot-message").last()).toContainText("Here is the answer.");
  await expect(page.locator("#chatBox .user-message")).toHaveCount(1);
  await expect(page.locator(".gx-turn-error")).toHaveCount(0);
  expect(calls).toBe(2);
  expect(JSON.parse(bodies[1]).message).toBe("Explain credits");
  expect(JSON.parse(bodies[1]).conversationId ?? null).toBeNull();
});

test("Edit on a failed answer puts the question back in the composer", async ({ page }) => {
  await workspace(page, (route) => route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: `data: ${JSON.stringify({ error: "404 This model is unavailable", conversationId: null, rolledBack: true })}\n\n` }));
  await page.locator("#userInput").fill("Draft a tagline");
  await page.keyboard.press("Enter");
  await page.locator(".gx-turn-error").getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("#userInput")).toHaveValue("Draft a tagline");
  await expect(page.locator("#chatBox .user-message")).toHaveCount(0);
});

test("add menu filters, opens sub-pages and attaches a sketch", async ({ page }) => {
  await workspace(page);
  await page.locator("#plusBtn").click();
  const palette = page.locator(".gx-cp");
  await expect(palette.locator(".gx-cp-row")).toHaveCount(11);
  await page.keyboard.type("canvas");
  await expect(palette.locator(".gx-cp-row")).toHaveCount(1);
  await palette.locator(".gx-cp-search input").fill("");

  // Sub-lists replace the root list, with a back row on top.
  await palette.locator(".gx-cp-row", { hasText: "Project" }).click();
  await expect(palette.locator(".gx-cp-back")).toHaveText("Projects");
  await palette.locator(".gx-cp-row", { hasText: "Launch plan" }).click();
  await expect(page.locator(".ws-toast")).toContainText("Working in Launch plan");
  await expect(palette).toHaveCount(0);

  await page.locator("#plusBtn").click();
  await palette.locator(".gx-cp-row", { hasText: "From Library" }).click();
  await palette.locator(".gx-cp-row", { hasText: "Brief.md" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { attachedFiles: File[] }).attachedFiles.map((file) => file.name))).toEqual(["Brief.md"]);

  await page.locator("#plusBtn").click();
  await palette.locator(".gx-cp-row", { hasText: "Draw" }).click();
  const surface = await page.locator(".gx-sketch-canvas").boundingBox();
  expect(surface).not.toBeNull();
  await page.mouse.move(surface!.x + 30, surface!.y + 30);
  await page.mouse.down();
  await page.mouse.move(surface!.x + 220, surface!.y + 120, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Attach sketch" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { attachedFiles: File[] }).attachedFiles.length)).toBe(2);
});

test("@ mentions sit inline in the text, delete as a whole and ride along on send", async ({ page }) => {
  const bodies: string[] = [];
  await workspace(page, async (route) => { bodies.push(route.request().postData() || ""); await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse("Done.") }); });
  const input = page.locator("#userInput");
  await input.click();
  await page.keyboard.type("Check @git");
  const palette = page.locator(".gx-cp");
  await expect(palette.locator(".gx-cp-row")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(palette).toHaveCount(0);
  await expect(input).toHaveValue("Check @GitHub ");
  await expect(page.locator(".gx-tok", { hasText: "GitHub" })).toBeVisible();

  await page.keyboard.type("issues with @copy");
  await expect(palette.locator(".gx-cp-row", { hasText: "Copy editor" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Check @GitHub issues with @Copy editor ");

  // Backspace removes a mention in one go; typing it again brings it back.
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("Check @GitHub issues with ");
  await expect(page.locator(".gx-tok")).toHaveCount(1);
  await page.keyboard.type("@copy");
  await expect(palette.locator(".gx-cp-row", { hasText: "Copy editor" })).toBeVisible();
  await page.keyboard.press("Enter");

  // Escape closes the list and leaves the typed text alone.
  await page.keyboard.type("@zz");
  await expect(palette.locator(".gx-cp-empty")).toHaveText("No matches");
  await page.keyboard.press("Escape");
  await expect(palette).toHaveCount(0);
  await expect(input).toHaveValue("Check @GitHub issues with @Copy editor @zz");
  for (let index = 0; index < 4; index++) await page.keyboard.press("Backspace");

  await page.keyboard.press("Enter");
  await expect.poll(() => bodies.length).toBe(1);
  const body = JSON.parse(bodies[0]);
  expect(body.message).toBe("Check @GitHub issues with @Copy editor");
  expect(body.presetId).toBe(5);
  await expect(page.locator(".gx-tok")).toHaveCount(0);
});

test("the add menu search finds installed plugins and skills and inserts them at the caret", async ({ page }) => {
  await workspace(page);
  const input = page.locator("#userInput");
  await input.fill("Ship it with");
  await page.locator("#plusBtn").click();
  await page.keyboard.type("git");
  const palette = page.locator(".gx-cp");
  await expect(palette.locator(".gx-cp-label", { hasText: "Plugins" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("Ship it with @GitHub ");
  await expect(page.locator(".gx-tok", { hasText: "GitHub" })).toBeVisible();
});

test("a long prompt moves the buttons below the text and can expand to full height", async ({ page }) => {
  await workspace(page);
  const form = page.locator("#chatForm");
  const input = page.locator("#userInput");
  await input.click();
  await page.keyboard.type("Short");
  await expect(form).not.toHaveClass(/is-multiline/);
  await expect(page.locator(".gx-expand-btn")).toHaveCount(0);

  await page.keyboard.press("Shift+Enter");
  await expect(form).toHaveClass(/is-multiline/);
  const text = await input.boundingBox(), plus = await page.locator("#plusBtn").boundingBox();
  expect(plus!.y).toBeGreaterThan(text!.y + text!.height - 4);

  // Expand shows from the second line on and stays put while more lines arrive.
  const expand = page.locator(".gx-expand-btn");
  await expect(expand).toBeVisible();
  for (let index = 0; index < 8; index++) await page.keyboard.press("Shift+Enter");
  await expect(expand).toBeVisible();
  await expand.click();
  await expect(form).toHaveClass(/is-expanded/);
  await expect(page.locator(".welcome-text")).toHaveCSS("max-height", "0px");
  await expect.poll(async () => (await input.boundingBox())!.height).toBeGreaterThan(300);
  // It fills the free height without pushing the page into a scroll.
  await page.waitForTimeout(700);
  const box = (await form.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await expand.click();
  await expect(form).not.toHaveClass(/is-expanded/);
  await expect.poll(async () => (await input.boundingBox())!.height).toBeLessThan(150);

  await input.fill("");
  await expect(form).not.toHaveClass(/is-multiline/);
});

test("/ runs commands and opens nested lists", async ({ page }) => {
  await workspace(page);
  const input = page.locator("#userInput");
  await input.click();
  await page.keyboard.type("/");
  const palette = page.locator(".gx-cp");
  await expect(palette.locator(".gx-cp-row", { hasText: "Model" })).toBeVisible();
  await page.keyboard.type("proj");
  await page.keyboard.press("Enter");
  await expect(palette.locator(".gx-cp-back")).toHaveText("Projects");
  await expect(input).toHaveValue("/");
  // Backspace on an empty filter goes back instead of deleting the "/".
  await page.keyboard.press("Backspace");
  await expect(palette.locator(".gx-cp-back")).toHaveCount(0);
  await expect(input).toHaveValue("/");
  await page.keyboard.type("canvas");
  await page.keyboard.press("Enter");
  await expect(page.locator(".gx-canvas")).toHaveClass(/is-open/);
  await expect(input).toHaveValue("");
});

test("drafts survive a reload for 24 hours, per chat", async ({ page }) => {
  await workspace(page);
  const input = page.locator("#userInput");
  await input.click();
  await page.keyboard.type("Half-written idea @git");
  await expect(page.locator(".gx-cp-row", { hasText: "GitHub" })).toBeVisible();
  await page.keyboard.press("Enter");
  await page.reload();
  await expect(input).toHaveValue("Half-written idea @GitHub ");
  const mention = page.locator(".gx-tok", { hasText: "GitHub" });
  await expect(mention).toBeVisible();

  // A mention is a link to its plugin page.
  await mention.click();
  await expect(page).toHaveURL(/\/plugins\/github$/);

  // An expired draft is dropped.
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((name) => name.startsWith("genyxo:draft:"))!;
    const draft = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...draft, savedAt: Date.now() - 25 * 60 * 60 * 1000 }));
  });
  await page.goto("/chat");
  await expect(input).toHaveValue("");
  await expect(page.locator(".gx-tok")).toHaveCount(0);
});

test("voice conversation detects the spoken language, answers in it and returns to listening", async ({ page }) => {
  // A tone stands in for speech: loud for about a second, then silence ends the phrase.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      gain.gain.value = 0.6;
      oscillator.connect(gain);
      const destination = context.createMediaStreamDestination();
      gain.connect(destination);
      oscillator.start();
      // Speech lasts about a second from when recording starts (after the Live attempt fails).
      const start = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (...args) {
        if (gain.gain.value > 0) setTimeout(() => { gain.gain.value = 0; }, 1100);
        return start.apply(this, args);
      };
      return destination.stream;
    } } });
  });
  const wav = (() => {
    const samples = 2400, data = Buffer.alloc(44 + samples * 2);
    data.write("RIFF", 0); data.writeUInt32LE(36 + samples * 2, 4); data.write("WAVEfmt ", 8); data.writeUInt32LE(16, 16);
    data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(24000, 24); data.writeUInt32LE(48000, 28);
    data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write("data", 36); data.writeUInt32LE(samples * 2, 40);
    return data.toString("base64");
  })();
  const spoken: Array<{ text: string; language?: string }> = [];
  let sent = "";
  let streamed: Record<string, unknown> = {};
  await workspace(page, async (route) => {
    streamed = route.request().postDataJSON();
    sent = String(streamed.message);
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse(`Genyxo — це робочий простір для всіх моделей. Він працює на одному балансі кредитів.

${fence}python file=hello.py
print("hi")
${fence}`) });
  });

  // Registered after the general API mock: later Playwright routes take precedence.
  // Live is unavailable here, so the call uses the record → transcribe → speech fallback.
  await page.route("**/api/chat/voice/live", (route) => route.fulfill({ status: 503, json: { message: "Voice needs a Gemini API key on the server." } }));
  await page.route("**/api/chat/voice/transcribe", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.mimeType).toMatch(/^audio\//);
    expect(body.audio.length).toBeGreaterThan(100);
    await route.fulfill({ json: { text: "Привіт, що таке Genyxo?", language: "uk" } });
  });
  await page.route("**/api/chat/voice/speak", async (route) => {
    spoken.push(route.request().postDataJSON());
    await route.fulfill({ json: { audio: wav, mimeType: "audio/wav" } });
  });
  await page.locator(".gx-call-btn").click();
  await expect(page.locator(".gx-voice-stage")).toBeVisible();
  await expect(page.locator("#welcomeScreen")).toBeHidden();
  await expect.poll(() => sent, { timeout: 15000 }).toBe("Привіт, що таке Genyxo?");
  await expect.poll(() => spoken.map((item) => item.text).join(" "), { timeout: 15000 }).toContain("одному балансі");
  expect(spoken.every((item) => item.language === "uk")).toBe(true);
  // The turn tells the server it was spoken and in which language; code is never read aloud.
  expect(streamed).toMatchObject({ voice: true, language: "uk" });
  await expect.poll(() => spoken.map((item) => item.text).join(" ")).toContain("Я додав файл у чат.");
  expect(spoken.map((item) => item.text).join(" ")).not.toContain("print");
  await expect(page.locator(".gx-file-card")).toContainText("hello.py");
  await expect(page.locator(".gx-voice-phase")).toHaveText("Listening", { timeout: 15000 });

  expect(spoken[0]).toMatchObject({ voice: "Kore" });

  // The glass voice picker shows the reply language, switches voices and remembers the choice.
  await page.locator(".gx-voice-picker-btn").click();
  await expect(page.locator(".gx-voice-menu-head")).toContainText("Replying in Українська");
  await page.getByRole("menuitemradio", { name: /Sulafat/ }).click();
  await expect(page.getByRole("menuitemradio", { name: /Sulafat/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator(".gx-voice-picker-btn")).toContainText("Sulafat");
  expect(await page.evaluate(() => localStorage.getItem("genyxo.voice"))).toBe("Sulafat");
  await page.keyboard.press("Escape");

  await page.locator(".gx-voice-mute").click();
  await expect(page.locator(".gx-voice-phase")).toHaveText("Microphone muted");
  await page.locator(".gx-voice-end").click();
  await expect(page.locator(".gx-voice-stage")).toHaveCount(0);
  await expect(page.locator(".gx-call-btn")).toBeVisible();
});

test("live voice call streams mic audio to Gemini Live, shows the reply and files, and saves the turn", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const destination = context.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      return destination.stream;
    } } });
  });
  await workspace(page);
  let setup: Record<string, unknown> | null = null;
  let audioFrames = 0;
  let audioType = "";
  let toolAnswered = false;
  let saved: Record<string, unknown> | null = null;
  const pcm = Buffer.alloc(24000 * 2 * 0.4).toString("base64");
  await page.route("**/api/chat/voice/live", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ voice: "Kore" });
    await route.fulfill({ json: { token: "single-use", model: "gemini-3.8-live", url: "wss://live.test/ws" } });
  });
  await page.route("**/api/chat/voice/turn", async (route) => {
    saved = route.request().postDataJSON();
    await route.fulfill({ json: { conversationId: 77, conversationTitle: "Voice chat", userMessageId: 5, messageId: 6 } });
  });
  await page.routeWebSocket("wss://live.test/**", (socket) => {
    expect(socket.url()).toContain("access_token=single-use");
    let replied = false;
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.setup) { setup = message.setup; socket.send(JSON.stringify({ setupComplete: {} })); }
      if (message.realtimeInput?.audio) {
        audioFrames += 1;
        audioType = message.realtimeInput.audio.mimeType;
        if (audioFrames === 5 && !replied) {
          replied = true;
          socket.send(JSON.stringify({ serverContent: { inputTranscription: { text: "Привіт, зроби файл hello.py" } } }));
          socket.send(JSON.stringify({ toolCall: { functionCalls: [{ id: "call-1", name: "create_file", args: { name: "hello.py", language: "python", content: "print('привіт')" } }] } }));
        }
      }
      if (message.toolResponse) {
        toolAnswered = true;
        socket.send(JSON.stringify({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcm } }] }, outputTranscription: { text: "Готово, файл у чаті." } } }));
        socket.send(JSON.stringify({ serverContent: { turnComplete: true } }));
      }
    });
  });

  await page.locator(".gx-call-btn").click();
  await expect(page.locator(".gx-voice-stage")).toBeVisible();
  await expect(page.locator("#chatBox .user-message")).toContainText("Привіт, зроби файл hello.py", { timeout: 15000 });
  await expect(page.locator("#chatBox .bot-message")).toContainText("Готово, файл у чаті.");
  await expect(page.locator("#chatBox .gx-file-card")).toContainText("hello.py");
  expect(setup).toEqual({ model: "models/gemini-3.8-live" });
  expect(audioType).toBe("audio/pcm;rate=16000");
  expect(toolAnswered).toBe(true);
  await expect.poll(() => saved).toMatchObject({ user: "Привіт, зроби файл hello.py" });
  expect(String(saved!.assistant)).toContain("```python file=hello.py");
  await expect(page).toHaveURL(new RegExp(`/c/${chatKey(77)}$`));
  await expect(page.locator(".gx-voice-phase")).toHaveText("Listening", { timeout: 10000 });
  await page.locator(".gx-voice-end").click();
  await expect(page.locator(".gx-voice-stage")).toHaveCount(0);
});

test("voice conversation asks guests to sign in instead of starting", async ({ page }) => {
  await page.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const style = document.createElement("style"); style.textContent = "nextjs-portal{display:none!important}"; document.head.appendChild(style); }));
  await mockApi(page);
  await page.goto("/chat");
  await page.locator(".gx-call-btn").click();
  await expect(page.locator(".ws-toast")).toContainText("Sign in to talk with the model");
  await expect(page.locator(".gx-voice-stage")).toHaveCount(0);
});

test("empty chat shows the orb, a large model mark and no starter chips", async ({ page }) => {
  await workspace(page);
  await expect(page.locator(".gx-welcome-orb .gx-orb")).toBeVisible();
  await expect(page.locator(".feature-card")).toHaveCount(0);
  const icon = await page.locator(".current-model-name .model-option-icon").boundingBox();
  expect(icon?.width).toBeGreaterThanOrEqual(26);
  await expect(page.locator(".ws-sidebar-brand")).toHaveAttribute("href", "/");
});
