import { expect, test as base, type Page } from "@playwright/test";

/** Fails any test whose page logs an error, and skips the first-run tour unless asked. */
export const test = base.extend<{ tour: boolean; errors: string[] }>({
  tour: [false, { option: true }],
  errors: [
    async ({ page, tour }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        // A failed chat request is logged by the browser and handled by the app.
        if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text());
      });
      if (!tour) {
        await page.addInitScript(() => {
          if (!localStorage.getItem("nexus-os-v1")) localStorage.setItem("nexus-os-v1", JSON.stringify({ state: { tourDone: true }, version: 0 }));
        });
      }
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const nav = (page: Page, label: string) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: label });

export const chat = (page: Page) => page.locator("#tour-companion");

export async function ask(page: Page, text: string) {
  await page.getByLabel("Ask Nexus anything").fill(text);
  await page.getByLabel("Ask Nexus anything").press("Enter");
}
