import { defineConfig } from "@playwright/test";

// Runs against the Docker stack with real model replies; see docs/local-development.md.
export default defineConfig({
  testDir: "./tests-live",
  outputDir: "test-results-live",
  timeout: 180000,
  workers: 1,
  // Free OpenRouter models are rate-limited upstream from time to time.
  retries: 2,
  use: { baseURL: process.env.GX_LIVE_URL || "http://localhost:3001", screenshot: "only-on-failure", trace: "retain-on-failure" },
});
