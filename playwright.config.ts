import { defineConfig, devices } from "@playwright/test";
import { DATABASE_URL } from "./e2e/db";

const PORT = 3210;
const MOCK_PORT = 3299;

export default defineConfig({
  testDir: "e2e",
  // One at a time, so timing-sensitive tests don't compete for the same server.
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
      command: `npx prisma migrate deploy && npm run build && npx next start --port ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/v1`,
        DATABASE_URL,
        BETTER_AUTH_URL: `http://localhost:${PORT}`,
        BETTER_AUTH_SECRET: "test-only-secret-that-is-at-least-32-chars",
        ALLOWED_EMAILS: "@nexus.test",
        // A key pair made only for tests, so push can be checked end to end against the mock.
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: "BPM8HYJfjJLqJAW2qbrBZbf86Dmv_3Jxm9URXywqZxibbYfUn7tCLkjTp_uppHK0RgsP1SHF2BPllss9qDlD_cI",
        VAPID_PRIVATE_KEY: "3qzbK8LBTh3S2b6cQBwRgrarcHP8Rvy3gTdsIgLq5ak",
        VAPID_SUBJECT: "mailto:tests@nexus.test",
        PUSH_ALLOW_HTTP: "1",
        RESEND_API_KEY: "test-resend-key",
        RESEND_BASE_URL: `http://127.0.0.1:${MOCK_PORT}/resend`,
        EMAIL_FROM: "NEXUS OS <hello@nexus.test>",
        CRON_SECRET: "test-cron-secret",
        GOOGLE_CLIENT_ID: "test-google-client",
        GOOGLE_CLIENT_SECRET: "test-google-secret",
        GOOGLE_API_BASE: `http://127.0.0.1:${MOCK_PORT}/google`,
        STRIPE_SECRET_KEY: "sk_test_mock",
        STRIPE_PRICE_PRO: "price_pro_mock",
        STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
        STRIPE_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
        PRO_PRICE_LABEL: "$12 a month",
        // Low, so a test can reach the Free plan's limit quickly.
        FREE_AI_DAILY: "3",
      },
    },
  ],
});
