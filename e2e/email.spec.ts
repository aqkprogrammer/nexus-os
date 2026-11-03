import type { APIRequestContext } from "@playwright/test";
import { expect, newEmail, ORIGIN, PASSWORD, signUp, test } from "./helpers";

test.use({ signedIn: false });

const MOCK = "http://127.0.0.1:3299";
interface SentEmail {
  subject: string;
  text: string;
  html: string;
}

const inbox = async (to: string): Promise<SentEmail[]> => (await fetch(`${MOCK}/email-log/${encodeURIComponent(to)}`)).json();
const linkIn = (email: SentEmail) => email.text.match(/https?:\/\/\S+/)![0];

async function waitFor(to: string, subject: string) {
  await expect.poll(async () => (await inbox(to)).some((e) => e.subject === subject)).toBe(true);
  return (await inbox(to)).find((e) => e.subject === subject)!;
}

const cron = (request: APIRequestContext, at: string, secret = "test-cron-secret") =>
  request.get(`/api/cron/digest?at=${encodeURIComponent(at)}`, { headers: { authorization: `Bearer ${secret}` } });

/** The next date, from today, that falls on `weekday` (0 is Monday), at `hour` UTC. */
function nextUtc(weekday: number, hour: number) {
  const d = new Date();
  d.setUTCHours(hour, 10, 0, 0);
  while ((d.getUTCDay() + 6) % 7 !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

test("a forgotten password can be reset by email", async ({ context, page }) => {
  const email = await signUp(context.request);
  await context.clearCookies();

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await page.getByLabel("Your account email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("a reset link is on its way");

  await page.goto(linkIn(await waitFor(email, "Reset your NEXUS OS password")));
  await page.getByLabel("New password").fill("a-much-better-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toContainText("Your password is changed");

  const signIn = (password: string) => context.request.post("/api/auth/sign-in/email", { headers: { origin: ORIGIN }, data: { email, password } });
  expect((await signIn(PASSWORD)).status()).toBe(401);
  expect((await signIn("a-much-better-password")).status()).toBe(200);
});

test("an email without an account gets the same answer, and nothing is sent", async ({ page }) => {
  const email = newEmail();
  await page.goto("/reset-password");
  await page.getByLabel("Your account email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If that email has an account");
  expect(await inbox(email)).toEqual([]);
});

test.describe("summary emails", () => {
  async function confirmedAccount(context: import("@playwright/test").BrowserContext, page: import("@playwright/test").Page, state: object) {
    const email = await signUp(context.request);
    await page.goto(linkIn(await waitFor(email, "Confirm your email for NEXUS OS")));
    const res = await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true, sample: false, timezone: "UTC", ...state }, version: 0 } });
    expect(res.status()).toBe(200);
    return email;
  }

  test("the daily brief arrives once, at 7 AM local time", async ({ context, page, request }) => {
    const at = nextUtc(2, 7);
    const email = await confirmedAccount(context, page, {
      prefs: { emailDigest: true, weeklyReview: false },
      priorities: [{ id: "p1", title: "Call the bank", done: false }],
      events: [{ id: "e1", title: "Dentist", day: 2, start: 9.5, duration: 1, area: "Health" }],
    });

    expect((await cron(request, new Date(at.getTime() - 3_600_000).toISOString())).status()).toBe(200);
    expect(await inbox(email)).toHaveLength(1);

    await cron(request, at.toISOString());
    await cron(request, at.toISOString());
    const briefs = (await inbox(email)).filter((e) => e.subject === "Your Wednesday brief");
    expect(briefs).toHaveLength(1);
    expect(briefs[0].text).toContain("9:30 AM: Dentist");
    expect(briefs[0].text).toContain("Call the bank");
  });

  test("the weekly review arrives on Sunday evening", async ({ context, page, request }) => {
    const email = await confirmedAccount(context, page, { prefs: { emailDigest: false, weeklyReview: true }, goals: [] });
    await cron(request, nextUtc(6, 18).toISOString());
    const review = await waitFor(email, "Your weekly review");
    expect(review.text).toContain("tasks finished");
  });

  test("turned-off summaries and unconfirmed emails get nothing", async ({ context, request }) => {
    const email = await signUp(context.request);
    await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { sample: false, timezone: "UTC", prefs: { emailDigest: true } }, version: 0 } });
    await cron(request, nextUtc(2, 7).toISOString());
    expect((await inbox(email)).filter((e) => e.subject.includes("brief"))).toEqual([]);
  });

  test("the schedule can't be triggered without the secret", async ({ request }) => {
    expect((await cron(request, new Date().toISOString(), "wrong")).status()).toBe(401);
  });
});
