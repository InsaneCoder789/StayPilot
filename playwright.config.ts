import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    env: {
      ...process.env,
      OTA_WEBHOOK_SECRET: process.env.OTA_WEBHOOK_SECRET ?? "e2e-ota-shared-secret",
      POS_WEBHOOK_SECRET: process.env.POS_WEBHOOK_SECRET ?? "e2e-pos-shared-secret",
      CRON_SECRET: process.env.CRON_SECRET ?? "e2e-cron-secret",
    },
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
