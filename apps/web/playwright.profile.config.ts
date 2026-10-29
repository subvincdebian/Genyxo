import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-profile",
  outputDir: "test-results-profile",
  timeout: 60000,
  expect: { timeout: 20000 },
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3001",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
});
