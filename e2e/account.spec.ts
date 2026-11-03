import type { BrowserContext, Page } from "@playwright/test";
import { expect, newEmail, ORIGIN, PASSWORD, signUp, test } from "./helpers";

test.use({ signedIn: false });

/** Creates an account in this browser, skips the tour and opens Settings. */
async function openSettings(context: BrowserContext, page: Page) {
  const email = await signUp(context.request);
  await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true }, version: 0 } });
  await page.goto("/settings");
  return email;
}

const signInStatus = (context: BrowserContext, email: string, password: string) =>
  context.request.post("/api/auth/sign-in/email", { headers: { origin: ORIGIN }, data: { email, password } }).then((r) => r.status());

const card = (page: Page, title: string) => page.locator("section").filter({ has: page.getByRole("heading", { name: title }) });

test("changing the password needs the current one and signs in with the new one", async ({ context, page }) => {
  const email = await openSettings(context, page);
  const password = card(page, "Password");

  await password.getByLabel("Current password").fill("not-the-password");
  await password.getByLabel("New password").fill("a-brand-new-password");
  await password.getByRole("button", { name: "Change password" }).click();
  await expect(password.getByRole("alert")).toContainText("isn't right");

  await password.getByLabel("Current password").fill(PASSWORD);
  await password.getByLabel("New password").fill("a-brand-new-password");
  await password.getByRole("button", { name: "Change password" }).click();
  await expect(password.getByRole("status")).toContainText("Password changed");

  expect(await signInStatus(context, email, PASSWORD)).toBe(401);
  expect(await signInStatus(context, email, "a-brand-new-password")).toBe(200);
});

test("changing the email needs the password", async ({ context, page }) => {
  await openSettings(context, page);
  const section = card(page, "Sign-in email");
  const next = newEmail();

  await section.getByLabel("New email").fill(next);
  await section.getByLabel("Current password").fill("not-the-password");
  await section.getByRole("button", { name: "Change email" }).click();
  await expect(section.getByRole("alert")).toContainText("isn't right");

  await section.getByLabel("Current password").fill(PASSWORD);
  await section.getByRole("button", { name: "Change email" }).click();
  await expect(section.getByRole("status")).toContainText("updated");
  await expect(section).toContainText(next);
  expect(await signInStatus(context, next, PASSWORD)).toBe(200);
});

test("other devices are listed and can be signed out", async ({ browser, context, page }) => {
  const email = await openSettings(context, page);
  const other = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": "10.9.9.9" } });
  expect(await signInStatus(other, email, PASSWORD)).toBe(200);

  await page.reload();
  const devices = card(page, "Signed-in devices");
  await expect(devices.getByRole("listitem")).toHaveCount(2);
  await expect(devices).toContainText("This device");

  await devices.getByRole("button", { name: "Sign out other devices" }).click();
  await expect(devices.getByRole("listitem")).toHaveCount(1);
  expect((await other.request.get("/api/workspace")).status()).toBe(401);
  await other.close();
});

test("the export holds the account and its workspace", async ({ context, page }) => {
  const email = await openSettings(context, page);
  const res = await context.request.get("/api/account/export");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  const data = await res.json();
  expect(data.account.email).toBe(email);
  expect(data.workspace).toMatchObject({ tourDone: true });
});

test("deleting the account needs the password and removes everything", async ({ context, page }) => {
  const email = await openSettings(context, page);
  await page.getByRole("button", { name: "Delete account" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByLabel("Enter your password to confirm").fill("not-the-password");
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(dialog.getByRole("alert")).toContainText("isn't right");

  await dialog.getByLabel("Enter your password to confirm").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/login/);
  expect(await signInStatus(context, email, PASSWORD)).toBe(401);
});
