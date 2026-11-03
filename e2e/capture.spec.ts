import type { Page } from "@playwright/test";
import { expect, nav, test } from "./helpers";

const capture = async (page: Page, text: string) => {
  await page.locator("main").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("c");
  const dialog = page.getByRole("dialog", { name: "Quick capture" });
  await dialog.getByLabel("What's on your mind?").fill(text);
  return dialog;
};

test.describe("without AI", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/capture", (route) => route.fulfill({ status: 503, json: { error: "not_configured" } }));
  });

  test("notes are sorted into tasks, memories, events and ideas", async ({ page }) => {
    await page.goto("/");

    await (await capture(page, "Buy a birthday card")).press("Enter");
    await expect(page.getByText("Added to your tasks: Buy a birthday card")).toBeVisible();

    await (await capture(page, "Remember Sam prefers green tea")).press("Enter");
    await expect(page.getByText("Saved to AI Brain: Sam prefers green tea")).toBeVisible();

    await (await capture(page, "Idea: a herb garden on the balcony")).press("Enter");
    await expect(page.getByText("Saved to the Idea Vault: A herb garden on the balcony")).toBeVisible();

    await (await capture(page, "Gym on Thursday at 6pm")).press("Enter");
    await expect(page.getByText("Added to your week on Thu at 18:00: Gym")).toBeVisible();

    await nav(page, "Life Planner").click();
    // The sample already has a Monday gym session, so this looks for the new one.
    await expect(page.locator('[data-event="Gym"][aria-label^="Gym, Thu at 6pm"]')).toBeVisible();
    await expect(page.locator("#today")).toContainText("Buy a birthday card");
    await nav(page, "AI Brain").click();
    await expect(page.locator("main")).toContainText("Sam prefers green tea");
  });

  test("choosing a type overrides the guess", async ({ page }) => {
    await page.goto("/");
    const dialog = await capture(page, "Lunch with Ana at 1pm");
    await dialog.getByRole("tab", { name: "Task" }).click();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Added to your tasks: Lunch with Ana")).toBeVisible();
  });
});

test("AI sorts the note when it's on", async ({ page }) => {
  await page.goto("/");
  await (await capture(page, "dentist appointment on wednesday afternoon")).press("Enter");
  await expect(page.getByText("Added to your week on Wed at 15:00: Dentist")).toBeVisible();
});

test("the top bar button opens it, and typing C in a field doesn't", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Ask Nexus anything").fill("c");
  await expect(page.getByRole("dialog", { name: "Quick capture" })).toHaveCount(0);
  await page.getByRole("button", { name: "Quick capture" }).click();
  await expect(page.getByRole("dialog", { name: "Quick capture" })).toBeVisible();
});
