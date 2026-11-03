import type { Page } from "@playwright/test";
import { createAccount, expect, newEmail, ORIGIN, PASSWORD, signUp, skipTour, test } from "./helpers";

const fill = async (page: Page, email: string, password = PASSWORD) => {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
};

const signIn = async (page: Page, email: string, password = PASSWORD) => {
  await page.goto("/login");
  await fill(page, email, password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
};

const signOut = async (page: Page, name: string) => {
  await page.getByRole("banner").getByRole("button", { name: new RegExp(name) }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
};

// Next.js keeps its own empty alert on the page for route announcements.
const alert = (page: Page, text: string | RegExp) => page.getByRole("alert").filter({ hasText: text });


test.describe("signed out", () => {
  test.use({ signedIn: false });

  test("the app sends visitors to sign in", async ({ page }) => {
    await page.goto("/planner");
    await expect(page).toHaveURL(/login/);
    await expect(page.getByRole("button", { name: "Sign in", exact: true }).last()).toBeVisible();
  });

  test("a forged session cookie still can't load a workspace", async ({ context, page }) => {
    await context.addCookies([{ name: "better-auth.session_token", value: "forged", url: ORIGIN }]);
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });

  test("the API refuses every request", async ({ request }) => {
    const headers = { origin: ORIGIN };
    expect((await request.get("/api/workspace")).status()).toBe(401);
    expect((await request.put("/api/workspace", { headers, data: { state: {}, version: 0 } })).status()).toBe(401);
    expect((await request.post("/api/chat", { headers, data: { messages: [], context: {} } })).status()).toBe(401);
  });

  test("a new account starts empty, with its own name and the tour", async ({ page }) => {
    await createAccount(page, newEmail(), "Priya");
    await expect(page.getByRole("dialog", { name: "Welcome tour" })).toBeVisible();
    await expect(page.getByRole("banner")).toContainText("Priya");
    await skipTour(page);
    await expect(page.locator("main")).toContainText("No priorities yet");
    await expect(page.locator("main")).toContainText("No goals yet");
    await expect(page.locator("main")).not.toContainText("Follow up with Laura");
  });

  test("an empty account shows no invented figures on any page", async ({ page }) => {
    await createAccount(page, newEmail(), "Priya");
    await skipTour(page);
    // Each of these only exists in the sample data.
    const invented = ["72°F", "top 12%", "1,342", "Nexus Pro", "iPhone 15 Pro", "Your best focus is before 11 AM", "Read your calendar"];
    for (const path of ["/", "/brain", "/agents", "/planner", "/analytics", "/automations", "/goals", "/actions", "/privacy", "/settings", "/spaces"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const text of invented) await expect(page.locator("main"), `${text} on ${path}`).not.toContainText(text);
    }
  });

  test("settings can load the sample data and clear it again", async ({ page }) => {
    await createAccount(page, newEmail(), "Priya");
    await skipTour(page);
    await page.goto("/settings");

    await page.getByRole("button", { name: "Load sample data" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Load sample data" }).click();
    await page.goto("/");
    await expect(page.getByRole("checkbox", { name: "Follow up with Laura" })).toBeVisible();
    await expect(page.getByRole("banner")).toContainText("Priya");

    await page.goto("/settings");
    await page.getByRole("button", { name: "Clear workspace" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Clear everything" }).click();
    await page.goto("/");
    await expect(page.locator("main")).toContainText("No priorities yet");
  });

  test("an email that isn't invited can't sign up", async ({ page }) => {
    await createAccount(page, `${crypto.randomUUID()}@elsewhere.test`, "Stranger");
    await expect(alert(page, "isn't invited")).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test("a wrong password shows an error and stays on sign in", async ({ page, context }) => {
    const email = await signUp(context.request);
    await context.clearCookies();
    await signIn(page, email, "not-the-password");
    await expect(alert(page, /invalid/i)).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });

  test("repeated wrong passwords are slowed down", async ({ page }) => {
    await page.goto("/login");
    await fill(page, newEmail(), "not-the-password");
    const submit = page.getByRole("button", { name: "Sign in", exact: true }).last();
    await expect(async () => {
      await submit.click();
      await expect(alert(page, "Too many attempts")).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 8000 });
  });

  test("work survives signing out and back in, and stays private to the account", async ({ page, context }) => {
    const email = newEmail();
    await createAccount(page, email, "Priya");
    await skipTour(page);
    await page.goto("/planner");
    await page.getByLabel("New task").fill("Book the dentist");
    await page.getByLabel("New task").press("Enter");
    await expect(page.locator("main")).toContainText("Book the dentist");

    expect(await page.evaluate(() => localStorage.length)).toBe(0);
    await signOut(page, "Priya");

    await createAccount(page, newEmail(), "Sam");
    await skipTour(page);
    await expect(page.locator("main")).not.toContainText("Book the dentist");
    await signOut(page, "Sam");

    await context.clearCookies();
    await signIn(page, email);
    await expect(page.getByRole("banner")).toContainText("Priya");
    await expect(page.getByRole("checkbox", { name: "Book the dentist" })).toBeVisible();
  });
});

test.describe("saving", () => {
  test("a stale save can't overwrite newer data", async ({ context }) => {
    const headers = { origin: ORIGIN };
    const put = (state: object, version: number) => context.request.put("/api/workspace", { headers, data: { state, version } });

    const fresh = await put({ tourDone: true, online: false }, 1);
    expect(fresh.status()).toBe(200);
    expect(await fresh.json()).toEqual({ version: 2 });

    const stale = await put({ online: true }, 1);
    expect(stale.status()).toBe(409);
    expect(await stale.json()).toMatchObject({ version: 2, state: { online: false } });
  });

  test("other sites can't write to a workspace", async ({ context }) => {
    const res = await context.request.put("/api/workspace", { headers: { origin: "https://evil.example" }, data: { state: {}, version: 1 } });
    expect(res.status()).toBe(403);
  });

  test("a failed load offers a retry and never saves over your data", async ({ page }) => {
    const saves: string[] = [];
    page.on("request", (r) => r.method() === "PUT" && r.url().includes("/api/workspace") && saves.push(r.url()));
    await page.route("**/api/workspace", (route) => route.fulfill({ status: 500, json: { error: "down" } }));
    await page.goto("/");
    await expect(alert(page, "couldn't load your workspace")).toBeVisible();
    expect(saves).toEqual([]);

    await page.unroute("**/api/workspace");
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a failed save warns and retries until it lands", async ({ page }) => {
    await page.goto("/");
    await page.route("**/api/workspace", (route) => (route.request().method() === "PUT" ? route.abort() : route.continue()));
    await page.getByRole("checkbox", { name: "Follow up with Laura" }).click();
    await expect(page.getByText("Couldn't save your latest changes")).toBeVisible();

    await page.unroute("**/api/workspace");
    await expect
      .poll(async () => JSON.stringify(await (await page.request.get("/api/workspace")).json()), { timeout: 12_000 })
      .toMatch(/"done":true,"title":"Follow up with Laura"/);
  });
});
