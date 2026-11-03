import type { Page } from "@playwright/test";
import { createAccount, expect, newEmail, ORIGIN, skipTour, test } from "./helpers";

test.use({ signedIn: false });

const DAY = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const stat = (page: Page, label: string) => page.locator(".nx-card").filter({ has: page.getByText(label, { exact: true }) });

/** Waits until every change, including its activity, has reached the server. */
async function settled(page: Page) {
  await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe("visible");
  await page.waitForTimeout(1200);
}

test("finished work is recorded, survives a reload and can be undone", async ({ page }) => {
  await createAccount(page, newEmail(), "Priya");
  await skipTour(page);
  await page.goto("/planner");

  await page.getByLabel("New task").fill("Write the report");
  await page.getByLabel("New task").press("Enter");
  await page.getByRole("checkbox", { name: "Write the report" }).click();

  const today = WEEKDAYS[(new Date().getDay() + 6) % 7];
  await page.getByLabel("New routine").fill("Read 20 pages");
  await page.getByLabel("New routine").press("Enter");
  await page.getByRole("button", { name: `Read 20 pages, ${today}` }).click();
  await settled(page);

  await page.goto("/analytics");
  await expect(stat(page, "Tasks done")).toContainText("1");
  await expect(page.locator("main")).toContainText("1 check-ins logged this week");

  await page.goto("/planner");
  await page.getByRole("checkbox", { name: "Write the report" }).click();
  await settled(page);
  await page.goto("/analytics");
  await expect(stat(page, "Tasks done")).toContainText("0");
});

test("earlier activity fills the longer ranges", async ({ page }) => {
  await createAccount(page, newEmail(), "Priya");
  await skipTour(page);
  await settled(page);

  const { version } = await (await page.request.get("/api/workspace")).json();
  const workspace = await (await page.request.get("/api/workspace")).json();
  const add = [10, 17].map((daysAgo) => ({ key: `task:old-${daysAgo}`, kind: "task", title: "Older task", at: Date.now() - daysAgo * DAY }));
  const res = await page.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: workspace.state, version, activity: { add, remove: [] } } });
  expect(res.status()).toBe(200);

  await page.goto("/analytics");
  await expect(stat(page, "Tasks done")).toContainText("0");
  await page.getByRole("tab", { name: "Last 4 Weeks" }).click();
  await expect(stat(page, "Tasks done")).toContainText("2");
  await expect(stat(page, "Focus time")).toContainText("No earlier period to compare yet");
});

test("the server refuses activity it can't trust", async ({ page }) => {
  await createAccount(page, newEmail(), "Priya");
  await skipTour(page);
  await settled(page);
  const workspace = await (await page.request.get("/api/workspace")).json();
  const put = (entry: object) =>
    page.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: workspace.state, version: workspace.version, activity: { add: [entry], remove: [] } } });

  expect((await put({ key: "x", kind: "hacked", title: "t", at: Date.now() })).status()).toBe(400);
  expect((await put({ key: "x", kind: "task", title: "t", at: Date.now() + 30 * DAY })).status()).toBe(400);
});
