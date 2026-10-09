import { test, expect } from "@playwright/test";
import { createServer, type Server } from "node:http";
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
