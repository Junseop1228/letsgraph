import { defineConfig, devices } from "@playwright/test";

// E2E for the demo path (specs/*). Runs against a production build on port 3200 with demo data (no keys needed).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3200", locale: "ko-KR", timezoneId: "Asia/Seoul", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: "npx next start -p 3200",
    url: "http://localhost:3200/explore",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
