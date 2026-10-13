import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
import { gzipSync } from "node:zlib";
import { spawn } from "node:child_process";
import path from "node:path";
test.describe.configure({ mode: "serial" });
let upstream: Server | undefined;
let unavailable = false;
test.beforeAll(async () => {
  upstream = createServer(async (req, res) => {
    if (req.url === "/__migration_request") {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          method: req.method,
          authorization: req.headers.authorization,
          body: Buffer.concat(chunks).toString(),
        }),
      );
    } else if (req.url === "/auth/__migration_redirect?state=fixture") {
      res.writeHead(302, {
        Location: "https://accounts.google.com/o/oauth2/auth?state=fixture",
        "Set-Cookie": ["first=fixture; HttpOnly; Path=/", "second=fixture; HttpOnly; Path=/"],
      });
      res.end();
    } else if (req.url === "/__migration_compressed") {
      const body = gzipSync(JSON.stringify({ message: "compressed fixture" }));
      res.writeHead(200, { "Content-Type": "application/json", "Content-Encoding": "gzip", "Content-Length": body.length });
      res.end(body);
    } else if (req.url === "/__migration_empty") {
      res.writeHead(204, { "X-Fixture": "empty" });
      res.end();
    } else if (req.url === "/__migration_stream") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      });
      res.write('data: {"token":"first"}\n\n');
      const timer = setTimeout(
        () => res.end('data: {"token":"second"}\n\n'),
        32_000,
      );
      res.on("close", () => clearTimeout(timer));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => {
    upstream?.once("error", () => {
      unavailable = true;
      resolve();
    });
    upstream?.listen(3000, "127.0.0.1", resolve);
  });
});

test("Next preserves OAuth redirects and separate cookies without following the provider", async ({ request }) => {
  test.skip(unavailable, "Port 3000 is occupied.");
  const response = await request.get("/auth/__migration_redirect?state=fixture", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("https://accounts.google.com/o/oauth2/auth?state=fixture");
  expect(response.headersArray().filter(header => header.name.toLowerCase() === "set-cookie").map(header => header.value)).toEqual([
    "first=fixture; HttpOnly; Path=/", "second=fixture; HttpOnly; Path=/",
  ]);
});

test("Next forwards compressed responses and bodyless statuses", async ({ request }) => {
  test.skip(unavailable, "Port 3000 is occupied.");
  const compressed = await request.get("/api/__migration_compressed");
  expect(compressed.status()).toBe(200);
  expect(await compressed.json()).toEqual({ message: "compressed fixture" });
  expect(compressed.headers()["content-encoding"]).toBeUndefined();
  const empty = await request.get("/api/__migration_empty");
  expect(empty.status()).toBe(204);
  expect(empty.headers()["x-fixture"]).toBe("empty");
  expect(await empty.body()).toHaveLength(0);
});

test("standalone uses BACKEND_URL supplied at runtime with the same build", async () => {
  const alternative = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ path: req.url }));
  });
  await new Promise<void>(resolve => alternative.listen(0, "127.0.0.1", resolve));
  const backendAddress = alternative.address();
  if (!backendAddress || typeof backendAddress === "string") throw Error("No backend port");
  const reservation = createServer();
  await new Promise<void>(resolve => reservation.listen(0, "127.0.0.1", resolve));
  const frontendAddress = reservation.address();
  if (!frontendAddress || typeof frontendAddress === "string") throw Error("No frontend port");
  await new Promise<void>(resolve => reservation.close(() => resolve()));
  const child = spawn(process.execPath, [".next/standalone/server.js"], {
    cwd: path.resolve(test.info().config.rootDir, ".."),
    env: { ...process.env, HOSTNAME: "127.0.0.1", PORT: String(frontendAddress.port), BACKEND_URL: `http://127.0.0.1:${backendAddress.port}/runtime` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let startupLog = "";
  child.stdout?.on("data", chunk => { startupLog += chunk.toString(); });
  child.stderr?.on("data", chunk => { startupLog += chunk.toString(); });
  try {
    const url = `http://127.0.0.1:${frontendAddress.port}/api/probe?encoded=a%2Fb`;
    await expect.poll(async () => {
      if (child.exitCode !== null) throw Error(`Standalone exited: ${startupLog}`);
      try { return (await fetch(url)).status; } catch { return 0; }
    }, { timeout: 15_000 }).toBe(200);
    expect(await (await fetch(url)).json()).toEqual({ path: "/runtime/probe?encoded=a%2Fb" });
  } finally {
    child.kill();
    alternative.closeAllConnections();
    await new Promise<void>(resolve => alternative.close(() => resolve()));
  }
});
test.afterAll(async () => {
  if (upstream?.listening)
    await new Promise<void>((resolve) => upstream?.close(() => resolve()));
});
test("Next proxy preserves method, Bearer header and JSON body", async ({
  request,
}) => {
  test.skip(
    unavailable,
    "Port 3000 belongs to another process; preserve that process.",
  );
  const response = await request.post("/api/__migration_request", {
    headers: { Authorization: "Bearer fixture-token" },
    data: { message: "Hello", model: "fixture", files: [] },
  });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({
    method: "POST",
    authorization: "Bearer fixture-token",
    body: JSON.stringify({ message: "Hello", model: "fixture", files: [] }),
  });
});
test("Next streams across an upstream pause longer than its old 30 second timeout", async () => {
  test.setTimeout(45_000);
  test.skip(unavailable, "Port 3000 is occupied.");
  const started = Date.now();
  const response = await fetch("http://127.0.0.1:3001/api/__migration_stream");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  if (!reader) throw Error("No stream body");
  const first = await reader.read();
  expect(new TextDecoder().decode(first.value)).toContain("first");
  expect(Date.now() - started).toBeLessThan(2000);
  let rest = "";
  for (;;) {
    const part = await reader.read();
    if (part.done) break;
    rest += new TextDecoder().decode(part.value);
  }
  expect(rest).toContain("second");
});
