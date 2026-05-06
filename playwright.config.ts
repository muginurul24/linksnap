import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { join } from "node:path";

loadEnvConfig(process.cwd());

const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const authEmailFile = join(process.cwd(), ".e2e/auth-emails.jsonl");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
      `rtk bun run dev --hostname 127.0.0.1 --port ${port}`,
    env: {
      AUTH_EMAIL_DELIVERY: "file",
      AUTH_EMAIL_FILE: authEmailFile,
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_APP_URL: baseURL,
    },
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
    reuseExistingServer: false,
    timeout: 120_000,
    url: baseURL,
  },
});
