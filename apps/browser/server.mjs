// Genyxo agent browser: a headless Chromium the chat agent drives one step at
// a time (open, read, click, type, select). Each chat gets its own session.
// Requests to private, loopback and link-local addresses are blocked, so the
// browser cannot be pointed at the platform's own services. Only the backend,
// holding BROWSER_TOKEN, can call it.
import http from "node:http";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { chromium } from "playwright";

const TOKEN = process.env.BROWSER_TOKEN || "";
const PORT = Number(process.env.PORT || 8090);
const MAX_SESSIONS = Number(process.env.BROWSER_SESSIONS || 6);
const IDLE_MS = 15 * 60 * 1000;
const NAV_TIMEOUT = 25_000;
const sessions = new Map();
let browser;

function privateAddress(address) {
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    if (value === "::1" || value === "::") return true;
    if (value.startsWith("::ffff:")) return privateAddress(value.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb)/.test(value);
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

const allowedHosts = new Map();
async function allowed(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") return true;
  if (!/^https?:$/.test(url.protocol)) return false;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host)) return false; // service names like "app", "mysql"
  const cached = allowedHosts.get(host);
  if (cached && cached.until > Date.now()) return cached.ok;
  let ok = false;
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    ok = addresses.length > 0 && addresses.every((entry) => !privateAddress(entry.address));
  } catch {
    ok = false;
  }
  allowedHosts.set(host, { ok, until: Date.now() + 60_000 });
  return ok;
}

async function getBrowser() {
  if (!browser || !browser.isConnected()) browser = await chromium.launch({ args: ["--disable-dev-shm-usage"] });
  return browser;
}

async function session(key) {
  let entry = sessions.get(key);
  if (!entry) {
    if (sessions.size >= MAX_SESSIONS) {
      const oldest = [...sessions.entries()].sort((a, b) => a[1].used - b[1].used)[0];
      await close(oldest[0]);
    }
    const context = await (await getBrowser()).newContext({
      viewport: { width: 1280, height: 860 },
      locale: "en-US",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 GenyxoAgent/1.0",
      acceptDownloads: false,
      serviceWorkers: "block",
    });
    await context.route("**/*", async (route) => {
      if (await allowed(route.request().url())) return route.continue();
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT);
    entry = { context, page, used: Date.now() };
    sessions.set(key, entry);
  }
  entry.used = Date.now();
  return entry;
}

async function close(key) {
  const entry = sessions.get(key);
  sessions.delete(key);
  await entry?.context.close().catch(() => {});
}

setInterval(() => {
  for (const [key, entry] of sessions) if (Date.now() - entry.used > IDLE_MS) void close(key);
}, 60_000).unref();

// Words on controls that commit something: these need the user's confirmation.
const RISKY = /\b(submit|send|pay|purchase|buy|order|checkout|check out|place order|confirm|book|reserve|subscribe|sign up|register|delete|remove|transfer|donate|post|publish|apply|accept)\b|оплат|купит|заказ|отправ|подтверд|забронир|подписат|удалит|перевест|опубликов/i;

/** Readable text and numbered interactive elements of the current page. */
async function snapshot(page) {
  const data = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 2 && rect.height > 2 && style.visibility !== "hidden" && style.display !== "none";
    };
    document.querySelectorAll("[data-genyxo-ref]").forEach((el) => el.removeAttribute("data-genyxo-ref"));
    const items = [];
    const nodes = document.querySelectorAll("a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=link], [role=checkbox], [role=tab], [contenteditable=true]");
    for (const el of nodes) {
      if (items.length >= 120 || !visible(el)) continue;
      const ref = String(items.length + 1);
      el.setAttribute("data-genyxo-ref", ref);
      const tag = el.tagName.toLowerCase();
      const label =
        el.getAttribute("aria-label") ||
        (el.labels && el.labels[0] && el.labels[0].innerText) ||
        el.getAttribute("placeholder") ||
        el.getAttribute("title") ||
        el.innerText ||
        el.getAttribute("value") ||
        el.getAttribute("name") ||
        "";
      items.push({
        ref,
        kind: tag === "a" ? "link" : tag === "select" ? "select" : tag === "textarea" || el.isContentEditable ? "textbox" : tag === "input" ? `input:${el.type || "text"}` : el.getAttribute("role") || tag,
        label: label.replace(/\s+/g, " ").trim().slice(0, 100),
        value: "value" in el && el.type !== "password" ? String(el.value || "").slice(0, 80) : undefined,
        href: tag === "a" ? el.href.slice(0, 200) : undefined,
        options: tag === "select" ? [...el.options].slice(0, 15).map((option) => option.text.trim()) : undefined,
      });
    }
    const main = document.querySelector("main, article, [role=main]") || document.body;
    return { title: document.title, text: (main.innerText || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 7000), items };
  });
  return { url: page.url(), ...data };
}

async function element(page, ref) {
  const locator = page.locator(`[data-genyxo-ref="${String(ref).replace(/[^0-9]/g, "")}"]`).first();
  if (!(await locator.count())) throw Object.assign(new Error("That element is no longer on the page; take a new snapshot"), { status: 409 });
  return locator;
}

/** Why clicking an element would commit something, or null. */
async function riskOf(page, locator) {
  return locator.evaluate((el, pattern) => {
    const text = `${el.innerText || ""} ${el.getAttribute("value") || ""} ${el.getAttribute("aria-label") || ""}`.trim();
    const type = (el.getAttribute("type") || "").toLowerCase();
    const inForm = Boolean(el.closest("form"));
    if (new RegExp(pattern, "i").test(text)) return `“${text.slice(0, 60)}”`;
    if (type === "submit" || (el.tagName === "BUTTON" && inForm && type !== "button" && type !== "reset")) return "submits a form";
    return null;
  }, RISKY.source);
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
}

const actions = {
  async open({ page }, body) {
    const url = String(body.url || "");
    if (!(await allowed(url))) throw Object.assign(new Error("This address is not allowed"), { status: 400 });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    await settle(page);
    return snapshot(page);
  },
  async snapshot({ page }) {
    return snapshot(page);
  },
  async back({ page }) {
    await page.goBack({ timeout: NAV_TIMEOUT }).catch(() => {});
    await settle(page);
    return snapshot(page);
  },
  async click({ page }, body) {
    const locator = await element(page, body.ref);
    const risk = await riskOf(page, locator);
    if (risk && !body.confirmed) return { needsConfirmation: true, reason: risk, url: page.url() };
    await locator.click({ timeout: 10_000 });
    await settle(page);
    return snapshot(page);
  },
  async type({ page }, body) {
    const locator = await element(page, body.ref);
    await locator.fill(String(body.text ?? "").slice(0, 5000), { timeout: 10_000 });
    return { ok: true, url: page.url() };
  },
  async select({ page }, body) {
    const locator = await element(page, body.ref);
    await locator.selectOption({ label: String(body.option || "") }).catch(() => locator.selectOption(String(body.option || "")));
    return { ok: true, url: page.url() };
  },
  async check({ page }, body) {
    const locator = await element(page, body.ref);
    await locator.setChecked(body.checked !== false, { timeout: 10_000 });
    return { ok: true, url: page.url() };
  },
  async screenshot({ page }) {
    const image = await page.screenshot({ type: "jpeg", quality: 60, fullPage: false });
    return { url: page.url(), image: image.toString("base64") };
  },
};

function authorized(request) {
  const supplied = Buffer.from(String(request.headers.authorization || "").replace(/^Bearer /, ""));
  const expected = Buffer.from(TOKEN);
  return TOKEN && supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function reply(response, status, body) {
  const data = JSON.stringify(body);
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) });
  response.end(data);
}

http
  .createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") return reply(response, 200, { ok: true, sessions: sessions.size });
    if (!authorized(request)) return reply(response, 401, { error: "Unauthorized" });
    const match = /^\/session\/([\w:-]{1,80})\/(\w+)$/.exec(request.url || "");
    if (!match) return reply(response, 404, { error: "Not found" });
    const [, key, action] = match;
    if (request.method === "DELETE" || action === "close") {
      await close(key);
      return reply(response, 200, { ok: true });
    }
    const handler = actions[action];
    if (!handler || request.method !== "POST") return reply(response, 404, { error: "Unknown action" });
    let body = {};
    try {
      let raw = "";
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 100_000) throw Object.assign(new Error("Request too large"), { status: 413 });
      }
      body = raw ? JSON.parse(raw) : {};
      return reply(response, 200, await handler(await session(key), body));
    } catch (error) {
      const message = String(error?.message || "Browser error").split("\n")[0].slice(0, 300);
      return reply(response, error?.status || 500, { error: /Timeout/i.test(message) ? "The page did not respond in time" : message });
    }
  })
  .listen(PORT, () => console.log(`agent browser on ${PORT}`));
