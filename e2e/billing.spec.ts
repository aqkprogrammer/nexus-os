import type { BrowserContext, Page } from "@playwright/test";
import Stripe from "stripe";
import { sql } from "./db";
import { ask, chat, expect, ORIGIN, signUp, test } from "./helpers";

test.use({ signedIn: false });

const webhooks = new Stripe("sk_test_mock").webhooks;

/** Sends an event to the app signed the way Stripe signs them, or with a bad signature. */
async function stripeEvent(page: Page, type: string, object: object, secret = "whsec_test_secret") {
  const payload = JSON.stringify({ id: `evt_${Date.now()}`, object: "event", type, data: { object } });
  return page.request.post("/api/billing/webhook", {
    headers: { "stripe-signature": webhooks.generateTestHeaderString({ payload, secret }), "content-type": "application/json" },
    data: payload,
  });
}

async function freeAccount(context: BrowserContext, page: Page) {
  const email = await signUp(context.request);
  await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true, sample: false }, version: 0 } });
  await page.goto("/settings");
  return email;
}

const planCard = (page: Page) => page.locator("#plan");

test("upgrading goes to Stripe Checkout, and Stripe's confirmation turns on Pro", async ({ context, page }) => {
  const email = await freeAccount(context, page);
  await expect(planCard(page)).toContainText("Free");
  await expect(planCard(page)).toContainText("$12 a month");
  await expect(planCard(page)).toContainText("0 of 3 requests");

  await page.route("https://checkout.stripe.test/**", (route) => route.fulfill({ body: "Stripe Checkout" }));
  await planCard(page).getByRole("button", { name: "Upgrade to Pro" }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.test\/cus_.*price=price_pro_mock/);

  const [{ customerId, userId }] = await sql<{ customerId: string; userId: string }>(
    `select b."customerId", b."userId" from billing b join "user" u on u.id = b."userId" where u.email = $1`,
    [email],
  );
  expect((await stripeEvent(page, "checkout.session.completed", { id: "cs_1", object: "checkout.session", customer: customerId, client_reference_id: userId, subscription: "sub_1" })).status()).toBe(200);

  await page.goto("/settings");
  await expect(planCard(page)).toContainText("Nexus Pro");
  await expect(planCard(page)).toContainText("0 of 500 requests");
  await expect(planCard(page).getByRole("button", { name: "Manage billing" })).toBeVisible();

  const subscription = (status: string) => ({
    id: "sub_1",
    object: "subscription",
    customer: customerId,
    status,
    items: { object: "list", data: [{ id: "si_1", current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
  });
  await stripeEvent(page, "customer.subscription.updated", subscription("past_due"));
  await page.reload();
  await expect(planCard(page)).toContainText("Payment due");

  await stripeEvent(page, "customer.subscription.deleted", subscription("canceled"));
  await page.reload();
  await expect(planCard(page).getByRole("button", { name: "Upgrade to Pro" })).toBeVisible();
});

test("events without Stripe's signature are refused", async ({ context, page }) => {
  await freeAccount(context, page);
  expect((await stripeEvent(page, "checkout.session.completed", {}, "whsec_wrong")).status()).toBe(400);
});

test("the Free plan's daily AI allowance is enforced", async ({ context, page }) => {
  await freeAccount(context, page);
  await page.goto("/");
  // Each reply has to finish before the next question can be sent.
  for (let i = 1; i <= 3; i++) {
    await ask(page, `hello ${i}`);
    await expect(chat(page)).toContainText(`hello ${i}`);
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(chat(page)).not.toContainText("AI allowance");
  }
  await ask(page, "hello again");
  await expect(chat(page)).toContainText("You've used today's AI allowance on the Free plan");
});
