import { expect, test } from "./helpers";

for (const route of ["/", "/brain", "/agents", "/planner", "/analytics", "/automations", "/goals", "/actions", "/privacy", "/settings", "/spaces"]) {
  test(`${route} has no sideways scrolling on a phone`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect.poll(() => page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  });
}

test("the menu opens and navigates on a phone", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: "Main" }).filter({ visible: true }).getByRole("link", { name: "Life Planner" }).click();
  await expect(page).toHaveURL(/planner/);
  await expect(page.getByRole("heading", { name: "Life Planner", level: 1 })).toBeVisible();
});
