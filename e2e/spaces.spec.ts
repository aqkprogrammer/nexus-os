import { randomUUID } from "node:crypto";
import type { Browser, Page } from "@playwright/test";
import { createAccount, expect, ORIGIN, signUp, test } from "./helpers";

test.use({ signedIn: false });

const MOCK = "http://127.0.0.1:3299";

async function inviteLink(to: string) {
  await expect.poll(async () => (await (await fetch(`${MOCK}/email-log/${encodeURIComponent(to)}`)).json()).length).toBeGreaterThan(0);
  const [email] = (await (await fetch(`${MOCK}/email-log/${encodeURIComponent(to)}`)).json()) as { text: string }[];
  return email.text.match(/https?:\/\/\S+/)![0];
}

/** A second person, in their own browser. */
async function person(browser: Browser) {
  const context = await browser.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  return { context, page: await context.newPage() };
}

async function ownerWithSpace(page: Page, context: import("@playwright/test").BrowserContext) {
  await signUp(context.request, undefined, "Priya");
  await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true, sample: false }, version: 0 } });
  await page.goto("/spaces");
  await page.getByRole("button", { name: "Create your first space" }).click();
  await page.getByLabel("Space name").fill("Family Circle");
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("button", { name: /Family Circle/ })).toBeVisible();
}

async function invite(page: Page, email: string, role: "editor" | "viewer") {
  await page.getByLabel("Invite by email").fill(email);
  await page.getByLabel("Their role").selectOption(role);
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByText(`Invitation sent to ${email}`)).toBeVisible();
}

test("an invited person joins, plans together, and their role is respected", async ({ browser, context, page }) => {
  await ownerWithSpace(page, context);
  // Not on the sign-up list: the invitation is what lets them create an account.
  const guest = `${randomUUID()}@family.test`;
  await invite(page, guest, "editor");

  const sam = await person(browser);
  await sam.page.goto(await inviteLink(guest));
  await expect(sam.page.getByRole("heading", { name: "You're invited" })).toBeVisible();
  await sam.page.getByRole("link", { name: "Continue" }).click();
  await createAccount(sam.page, guest, "Sam");
  await expect(sam.page.getByText("You joined Family Circle")).toBeVisible();

  await sam.page.goto("/spaces");
  await expect(sam.page.locator("main")).toContainText("You're an editor here.");
  await sam.page.getByLabel("Shared event").fill("Family dinner");
  await sam.page.getByLabel("Day").selectOption("4");
  await sam.page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(sam.page.locator("main")).toContainText("Family dinner");

  await page.reload();
  await expect(page.locator("main")).toContainText("Family dinner");
  await page.getByLabel("Role for Sam").selectOption("viewer");
  await expect(page.getByText("Role updated")).toBeVisible();

  await sam.page.reload();
  await expect(sam.page.locator("main")).toContainText("You can view this space");
  await expect(sam.page.getByLabel("Shared event")).toHaveCount(0);
  const spaceId = (await (await sam.context.request.get("/api/spaces")).json()).spaces[0].id;
  const add = await sam.context.request.post(`/api/spaces/${spaceId}/items`, { headers: { origin: ORIGIN }, data: { kind: "event", data: { title: "Sneaky", day: 1, start: 9, duration: 1 } } });
  expect(add.status()).toBe(403);

  await page.getByRole("button", { name: "Remove Sam" }).click();
  expect((await sam.context.request.get(`/api/spaces/${spaceId}/items`)).status()).toBe(404);
  await sam.context.close();
});

test("an invitation only works for the email it was sent to", async ({ browser, context, page }) => {
  await ownerWithSpace(page, context);
  const invited = `${randomUUID()}@family.test`;
  await invite(page, invited, "viewer");
  const link = await inviteLink(invited);

  const other = await person(browser);
  await signUp(other.context.request);
  await other.page.goto(link);
  await expect(other.page.getByRole("alert").filter({ hasText: `This invitation is for ${invited}` })).toBeVisible();
  await other.context.close();
});

test("two people ticking different milestones at once both count", async ({ context, page }) => {
  await ownerWithSpace(page, context);
  const spaceId = (await (await context.request.get("/api/spaces")).json()).spaces[0].id;
  const headers = { origin: ORIGIN };
  const milestones = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, title: `Step ${i}`, done: false }));
  const { item } = await (await context.request.post(`/api/spaces/${spaceId}/items`, { headers, data: { kind: "goal", data: { title: "Trip", milestones } } })).json();

  await Promise.all(milestones.map((m) => context.request.patch(`/api/spaces/${spaceId}/items/${item.id}`, { headers, data: { milestone: m.id, done: true } })));

  const { items } = await (await context.request.get(`/api/spaces/${spaceId}/items`)).json();
  expect(items[0].data.milestones.every((m: { done: boolean }) => m.done)).toBe(true);
});

test("each person can only send so many new invitations a day", async ({ context, page }) => {
  await ownerWithSpace(page, context);
  const spaceId = (await (await context.request.get("/api/spaces")).json()).spaces[0].id;
  const send = (email: string) => context.request.post(`/api/spaces/${spaceId}/members`, { headers: { origin: ORIGIN }, data: { email, role: "viewer" } });

  const first = `${randomUUID()}@family.test`;
  for (let i = 0; i < 20; i++) expect((await send(i === 0 ? first : `${randomUUID()}@family.test`)).status()).toBe(200);
  expect((await send(`${randomUUID()}@family.test`)).status()).toBe(429);
  // Inviting someone again renews their invitation and isn't a new one.
  expect((await send(first)).status()).toBe(200);
});

test("people outside a space can't see it", async ({ browser, context, page }) => {
  await ownerWithSpace(page, context);
  const spaceId = (await (await context.request.get("/api/spaces")).json()).spaces[0].id;
  const stranger = await person(browser);
  await signUp(stranger.context.request);
  expect((await stranger.context.request.get(`/api/spaces/${spaceId}/items`)).status()).toBe(404);
  expect((await (await stranger.context.request.get("/api/spaces")).json()).spaces).toEqual([]);
  await stranger.context.close();
});
