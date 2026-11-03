import { expect, test } from "./helpers";

const library = (page: import("@playwright/test").Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Memory Library" }) });

test("AI Brain finds memories by meaning, not just matching words", async ({ page }) => {
  await page.goto("/brain");
  await page.getByRole("button", { name: /Add memory/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("input").first().fill("Sam prefers green tea");
  await dialog.getByRole("button", { name: "Save memory" }).click();

  // "Sam prefers green tea" shares no words with the search, so only meaning can find it.
  await page.getByPlaceholder("Search memories").fill("favourite beverage");
  await expect(library(page)).toContainText("best matches by meaning first", { timeout: 10_000 });
  await expect(library(page).locator("li").first()).toContainText("Sam prefers green tea");
});

test("without AI, search matches words", async ({ page }) => {
  await page.route("**/api/memory/search", (route) => route.fulfill({ status: 503, json: { error: "not_configured" } }));
  await page.goto("/brain");
  await page.getByPlaceholder("Search memories").fill("costco");
  await expect(library(page)).toContainText("Uploaded receipt - Costco");
  await expect(library(page)).not.toContainText("by meaning");
});
