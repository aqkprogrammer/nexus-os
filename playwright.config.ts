import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
const MOCK_PORT = 3299;

export default defineConfig({
  testDir: "e2e",
  // Tests share one rate-limited chat endpoint, so they run one at a time.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1938, height: 1010 },
    // Local runs use the installed Chrome, so there's no browser download.
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: /mobile/ },
    { name: "mobile", testMatch: /mobile/, use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    {
      command: `node e2e/mock-openai.mjs ${MOCK_PORT}`,
      url: `http://127.0.0.1:${MOCK_PORT}/health`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: { OPENAI_API_KEY: "test-key", OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1` },
    },
  ],
});
