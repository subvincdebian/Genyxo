import { expect, test } from "@playwright/test";
import { authenticate, mockApi } from "./fixtures";

test("composer stays compact and uses a themed scrollbar and attachment icon", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await mockApi(page);
  await page.goto("/chat");
  const input = page.locator("#userInput");
  await expect(input).toBeEnabled();
  await input.fill("Hello\nworld");
  const shortMetrics = await input.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(shortMetrics.height).toBeLessThanOrEqual(55);
  expect(shortMetrics.scrollHeight).toBeLessThanOrEqual(shortMetrics.clientHeight);
  await expect(page.locator(".textarea-wrapper")).not.toHaveClass(/is-scrollable/);
  await expect(page.locator("#plusBtn")).toBeEnabled();
  // The add control uses the secondary text token and brightens on hover.
  await expect(page.locator("#plusBtn")).toHaveCSS("color", "rgb(195, 201, 198)");
  await expect(page.locator("#plusBtn svg")).toHaveCSS("stroke", "rgb(195, 201, 198)");

  await input.fill(Array(12).fill("A longer message line").join("\n"));
  const overflowMetrics = await input.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
  }));
  expect(overflowMetrics.height).toBeLessThanOrEqual(144);
  expect(overflowMetrics.scrollHeight).toBeGreaterThan(overflowMetrics.clientHeight);
  await expect(page.locator(".textarea-wrapper")).toHaveClass(/is-scrollable/);
  await expect(page.locator(".composer-scrollbar")).toHaveCSS("opacity", "1");
  await expect(page.locator(".composer-scrollbar-thumb")).toHaveCSS("background-color", "rgb(155, 171, 173)");
  const scrollbar = await page.locator(".composer-scrollbar").boundingBox();
  expect(scrollbar).not.toBeNull();
  await page.mouse.click(scrollbar!.x + scrollbar!.width / 2, scrollbar!.y + scrollbar!.height - 3);
  expect(await input.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await expect(page.locator("#plusBtn")).toHaveCSS("color", "rgb(21, 26, 27)");
  await expect(page.locator("#plusBtn svg")).toHaveCSS("stroke", "rgb(21, 26, 27)");
  await expect(page.locator(".composer-scrollbar-thumb")).toHaveCSS("background-color", "rgb(100, 122, 125)");
  await input.fill("Short again");
  await expect(page.locator(".textarea-wrapper")).not.toHaveClass(/is-scrollable/);
});

test("compact composer, voice input and grouped model favorites", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  // Dictation records the microphone and asks the server (Gemini) to transcribe it.
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
  await mockApi(page);
  let dictated: { audio: string; mimeType: string } | null = null;
  await page.route("**/api/chat/voice/transcribe", async (route) => {
    dictated = route.request().postDataJSON();
    await route.fulfill({ json: { text: "Spoken message", language: "en" } });
  });
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await expect(page.locator("#sendBtn")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#voiceBtn")).toBeVisible();
  await page.locator("#userInput").fill("Draft");
  await expect(page.locator("#sendBtn")).toHaveAttribute("aria-hidden", "false");
  const oneLineHeight = await page.locator("#chatForm").evaluate((form) => form.getBoundingClientRect().height);
  expect(oneLineHeight).toBeLessThanOrEqual(70);
  await page.locator("#userInput").fill("");
  await expect(page.locator("#sendBtn")).toHaveAttribute("aria-hidden", "true");
  await page.locator("#voiceBtn").click();
  await expect(page.locator("#voiceBtn")).toHaveClass(/is-listening/);
  await page.waitForTimeout(1600);
  await page.locator("#voiceBtn").click();
  await expect(page.locator("#userInput")).toHaveValue("Spoken message");
  await expect(page.locator("#voiceBtn")).not.toHaveClass(/is-listening|is-transcribing/);
  expect(dictated!.mimeType).toMatch(/^audio\//);
  await page.locator("#userInput").fill("");
  await page.locator("#fileInput").setInputFiles({ name: "note.txt", mimeType: "text/plain", buffer: Buffer.from("Notes") });
  await expect(page.locator("#sendBtn")).toHaveAttribute("aria-hidden", "false");

  await page.locator("#customModelSelect").click();
  // The default model is Gemini, so its family opens already expanded.
  await expect(page.locator('[data-provider="Gemini"]')).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Add Gemini 3.5 Flash to favorites" }).click();
  await expect(page.getByRole("button", { name: "Remove Gemini 3.5 Flash from favorites" })).toBeVisible();
  await page.locator('[data-mode="image"]').click();
  await expect(page.locator(".model-picker-tabs")).toHaveAttribute("data-active-mode", "image");
  await expect(page.locator('.custom-options li[data-value="openai/dall-e-3"]')).toBeVisible();
  await page.locator('[data-mode="video"]').click();
  await expect(page.locator(".model-picker-tabs")).toHaveAttribute("data-active-mode", "video");
  await expect(page.locator('.custom-options li[data-value="kling-video"]')).toBeVisible();
  await page.reload();
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#customModelSelect").click();
  await expect(page.getByRole("button", { name: "Remove Gemini 3.5 Flash from favorites" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#customModelSelect").click();
  await page.locator("#userInput").fill("Mobile message");
  await expect(page.locator("#sendBtn")).toHaveAttribute("aria-hidden", "false");
  const composer = await page.locator("#chatForm").boundingBox();
  expect(composer && composer.x + composer.width).toBeLessThanOrEqual(390);
});

test("model families remain readable in light theme", async ({ page }) => {
  await authenticate(page);
  await page.addInitScript(() => localStorage.setItem("theme", "light"));
  await mockApi(page);
  await page.goto("/chat");
  await expect(page.locator("#userInput")).toBeEnabled();
  await page.locator("#customModelSelect").click();
  await expect(page.locator('[data-provider="Gemini"]')).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('.model-provider-options li[data-value="google/gemini-3.5-flash"]')).toBeVisible();
  await expect(page.locator('[data-provider="Gemini"]')).toHaveCSS("color", "rgb(32, 51, 53)");
  await expect(page.locator('.model-provider-options li[data-value="google/gemini-3.5-flash"]')).toHaveCSS("color", "rgb(52, 76, 77)");
});

test("projects, alternatives, comparison and library stay connected", async ({ page }) => {
  page.on("pageerror", (error) => console.error("Chat workspace page error:", error.message));
  await authenticate(page);
  const projects: Array<Record<string, unknown>> = [];
  const library: Array<Record<string, unknown>> = [];
  let streamPayload: Record<string, unknown> = {};
  await mockApi(page, async (route, path) => {
    if (path === "/chat/workspace") {
      await route.fulfill({ json: { projects, conversations: streamPayload.message ? [{ id: 42, title: "Question", projectId: 5, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }] : [], preferences: { timezone: "UTC" }, capabilities: {} } }); return true;
    }
    if (path === "/chat/workspace/library" && route.request().method() === "GET") {
      await route.fulfill({ json: { items: library, folders: [], hasMore: false } }); return true;
    }
    if (path === "/chat/projects" && route.request().method() === "GET") {
      await route.fulfill({ json: projects }); return true;
    }
    if (path === "/chat/workspace/projects" && route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      projects.push({ id: 5, name: input.name, instructions: input.instructions, files: input.files || [] });
      await route.fulfill({ json: projects[0] }); return true;
    }
    if (path === "/chat/stream") {
      streamPayload = route.request().postDataJSON();
      const events = [
        { status: "conversation", conversationId: 42, conversationTitle: "Question" },
        { token: "Original answer", conversationId: 42 },
        { status: "done", messageId: 11, creditBalance: 140 },
      ];
      await route.fulfill({ status: 200, contentType: "text/event-stream", body: events.map((item) => `data: ${JSON.stringify(item)}\n\n`).join("") });
      return true;
    }
    if (path === "/chat/alternative") {
      await route.fulfill({ json: { id: 12, content: "Alternative answer", model: "google/gemini-2.5-flash", alternativeToMessageId: 11, activity: ["Generated alternative answer"], sources: [] } });
      return true;
    }
    if (path === "/chat/library" && route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      library.push({ id: 8, name: input.name, type: "document", sourceMessageId: input.sourceMessageId });
      await route.fulfill({ json: library[0] }); return true;
    }
    if (path === "/chat/library" && route.request().method() === "GET") {
      await route.fulfill({ json: library }); return true;
    }
    return false;
  });
  await page.goto("/chat");
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await page.getByLabel("Project name", { exact: true }).fill("Research");
  await page.locator('#workspace-project-instructions').fill("Answer concisely.");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Research", exact: true })).toBeVisible();
  await page.getByRole("dialog", { name: "Research", exact: true }).getByRole("button", { name: "New chat", exact: true }).click();
  await expect(page.locator("#activeProjectBtn")).toContainText("Research");
  await page.locator("#userInput").fill("Question");
  await page.locator("#sendBtn").click();
  await expect(page.locator("#chatBox")).toContainText("Original answer");
  await expect(page.locator(".ws-project-chats")).toContainText("Question");
  await expect(page.getByRole("region", { name: "Recent", exact: true })).not.toContainText("Question");
  expect(streamPayload.projectId).toBe(5);
  await page.getByRole("button", { name: "Answer with another model" }).click();
  await page.getByRole("button", { name: "Generate alternative" }).click();
  await expect(page.locator("#chatBox")).toContainText("Alternative answer");
  await page.getByRole("button", { name: "Compare answers" }).first().click();
  await expect(page.locator(".answer-comparison")).toContainText("Original answer");
  await expect(page.locator(".answer-comparison")).toContainText("Alternative answer");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Save as document" }).first().click();
  await page.locator(".workspace-sidebar").getByRole("link", { name: "Library", exact: true }).click();
  await expect(page.locator(".lb-tile")).toHaveCount(1);
});
