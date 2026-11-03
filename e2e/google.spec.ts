import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { expect, ORIGIN, signUp, test } from "./helpers";

test.use({ signedIn: false });

/** Stores a Google connection directly, as finishing Google's consent screen would. */
async function connectGoogle(email: string) {
  const [{ id }] = await sql<{ id: string }>(`select id from "user" where email = $1`, [email]);
  await sql(
    `insert into account (id, "accountId", "providerId", "userId", "accessToken", "accessTokenExpiresAt", scope, "createdAt", "updatedAt")
     values ($1, $2, 'google', $3, 'test-google-token', now() + interval '1 hour', 'calendar.readonly gmail.readonly', now(), now())`,
    [randomUUID(), randomUUID(), id],
  );
}

async function account(context: import("@playwright/test").BrowserContext) {
  const email = await signUp(context.request);
  await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true, sample: false }, version: 0 } });
  return email;
}

test("before connecting, only Google apps can be switched on", async ({ context, page }) => {
  await account(context);
  await page.goto("/automations");
  const apps = page.locator("#apps");
  await expect(apps.getByRole("switch", { name: "Connect Gmail" })).toHaveAttribute("aria-checked", "false");
  await expect(apps.locator(".nx-card").filter({ hasText: "Slack" })).toContainText("Coming soon");
});

test("once connected, Google events and unread mail appear, and disconnecting removes them", async ({ context, page }) => {
  const email = await account(context);
  await connectGoogle(email);

  await page.goto("/planner");
  await expect(page.locator('[data-event="Team offsite"]')).toHaveAttribute("aria-label", "Team offsite, Wed at 10am, from Google Calendar");
  await expect(page.locator('[data-event="Public holiday"]')).toHaveCount(0);
  await page.locator('[data-event="Team offsite"]').click();
  await expect(page.getByRole("dialog")).toContainText("From your Google Calendar");
  await expect(page.getByRole("dialog").getByRole("button", { name: "Remove event" })).toBeHidden();
  await page.keyboard.press("Escape");

  await page.goto("/");
  await page.getByRole("button", { name: "Open Brief" }).click();
  const brief = page.getByRole("dialog", { name: "Your Morning Brief" });
  await expect(brief).toContainText("Contract signed");
  await expect(brief).toContainText("Ana Ruiz");
  await expect(brief).toContainText("Your Bank");
  await page.keyboard.press("Escape");

  await page.goto("/automations");
  const gmail = page.locator("#apps").getByRole("switch", { name: "Connect Gmail" });
  await expect(gmail).toHaveAttribute("aria-checked", "true");
  await gmail.click();
  await expect(gmail).toHaveAttribute("aria-checked", "false");
  await page.goto("/planner");
  await expect(page.locator('[data-event="Team offsite"]')).toHaveCount(0);
});

test("Google data is only for the account that connected it", async ({ request }) => {
  expect((await request.get("/api/google/calendar?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z")).status()).toBe(401);
});
