import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  outputDir: "test-results-workspace",
  use: { ...base.use, baseURL: "http://localhost:3013", screenshot: "only-on-failure" },
  webServer: {
    command: "npx next dev --port 3013 --webpack",
    env: { GENYXO_NEXT_DIST_DIR: ".next-workspace" },
    url: "http://localhost:3013/chat",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
