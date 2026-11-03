import type { Page } from "@playwright/test";
import { expect, test } from "./helpers";

async function launch(page: Page, task: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch an Agent" }).click();
  await page.getByLabel(/What should/).fill(task);
  await page.getByRole("button", { name: /^Launch / }).last().click();
}

async function newGoal(page: Page, title: string) {
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).click();
  await page.getByLabel("What do you want to achieve?").fill(title);
  await page.getByRole("dialog", { name: "New goal" }).locator("button[type=submit]").click();
}

test.describe("agents", () => {
  test("with AI, the agent's actual work waits for approval", async ({ page }) => {
    await launch(page, "Plan my next week");
    const actions = page.locator("#tour-actions");
    await expect(actions).toContainText("Plan my next week", { timeout: 15_000 });
    await actions.locator("li").filter({ hasText: "Plan my next week" }).getByRole("button", { name: "Review" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("I drafted a plan from your calendar");
    await expect(dialog.getByLabel("Agent result")).toContainText("Monday: deep work on the agent engine");
    await expect(dialog).toContainText("High");
  });

  test("a failed run says so and leaves nothing to approve", async ({ page }) => {
    await launch(page, "Please fail at this");
    await expect(page.getByText("Planner couldn't finish").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("#tour-actions")).not.toContainText("Please fail at this");
  });

  test("without AI, the result is clearly a preview", async ({ page }) => {
    await page.route("**/api/agents/run", (route) => route.fulfill({ status: 503, json: { error: "not_configured" } }));
    await launch(page, "Draft a thank-you note");
    const actions = page.locator("#tour-actions");
    await expect(actions).toContainText("Draft a thank-you note", { timeout: 15_000 });
    await actions.locator("li").filter({ hasText: "Draft a thank-you note" }).getByRole("button", { name: "Review" }).click();
    await expect(page.getByRole("dialog")).toContainText("Turn on AI to have agents do the work for real");
  });
});

test.describe("goal plans", () => {
  test("with AI, the plan is written for the goal", async ({ page }) => {
    await newGoal(page, "Run a 10 km race");
    await expect(page.locator("main")).toContainText("Pick a training plan", { timeout: 10_000 });
    await expect(page.locator("main")).toContainText("Saturday mornings are free");
  });

  test("without AI, the starting plan stays and says so", async ({ page }) => {
    await page.route("**/api/plan", (route) => route.fulfill({ status: 503, json: { error: "not_configured" } }));
    await newGoal(page, "Learn to bake bread");
    await expect(page.locator("main")).toContainText("Measure where you are today", { timeout: 10_000 });
    await expect(page.locator("main")).toContainText("turn on AI for a plan built from your schedule");
    await expect(page.locator("main")).not.toContainText("Drafting a plan");
  });
});
