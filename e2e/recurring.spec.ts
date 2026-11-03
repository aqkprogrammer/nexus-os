import type { Page } from "@playwright/test";
import { createAccount, expect, newEmail, ORIGIN, skipTour, test } from "./helpers";

const DAY = 86_400_000;

/** Midnight on this week's Monday, so every date the tests use is close to the real one the server checks. */
function thisMonday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const settled = (page: Page) => page.waitForTimeout(1500);
const stat = (page: Page, label: string) => page.locator(".nx-card").filter({ has: page.getByText(label, { exact: true }) });

test.describe("repeating tasks", () => {
  test.use({ signedIn: false });

  test("a daily task reopens the next day, and each day counts", async ({ page }) => {
    const monday = thisMonday();
    await page.clock.install({ time: monday + 10 * 3_600_000 });
    await createAccount(page, newEmail(), "Priya");
    await skipTour(page);
    await page.goto("/planner");

    await page.getByLabel("New task").fill("Stretch");
    await page.getByLabel("Repeat", { exact: true }).selectOption("daily");
    await page.getByLabel("New task").press("Enter");
    await expect(page.getByRole("button", { name: "Stretch repeats: Every day. Change" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Stretch" }).click();
    await settled(page);

    await page.clock.setSystemTime(monday + DAY + 10 * 3_600_000);
    await page.reload();
    await expect(page.getByRole("checkbox", { name: "Stretch" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("checkbox", { name: "Stretch" }).click();
    await settled(page);

    await page.goto("/analytics");
    await expect(stat(page, "Tasks done")).toContainText("2");
  });

  test("unfinished tasks from an earlier day move to today", async ({ context, page }) => {
    await createAccount(page, newEmail(), "Priya");
    await skipTour(page);
    await settled(page);
    const workspace = await (await context.request.get("/api/workspace")).json();
    const state = { ...workspace.state, priorities: [{ id: "old", title: "File the taxes", done: false, due: "2020-01-01" }] };
    await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state, version: workspace.version } });

    await page.reload();
    await expect(page.getByText("1 unfinished task moved to today")).toBeVisible();
    await expect(page.locator("main")).toContainText("File the taxes");
  });
});

test("an event reminder arrives before it starts", async ({ page }) => {
  const today = new Date();
  today.setHours(8, 49, 30, 0);
  await page.clock.install({ time: today });
  await page.goto("/planner");

  await page.getByRole("button", { name: "New event" }).click();
  const dialog = page.getByRole("dialog", { name: "New event" });
  await dialog.getByLabel("Title").fill("Morning sync");
  await expect(dialog.getByLabel("Reminder")).toHaveValue("10");
  await dialog.getByRole("button", { name: "Add event" }).click();

  await page.clock.fastForward("01:00");
  await expect(page.getByText(/Morning sync starts in (9|10) min/).first()).toBeVisible();
});
