import { defineConfig, devices } from "@playwright/test";

/**
 * Run E2E: start MongoDB + backend on :8080, then:
 *   cd web && npx playwright install chromium && npm run test:e2e
 * Vite dev server is started automatically unless reuseExistingServer finds one.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000
  }
});
