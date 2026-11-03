import { randomInt, randomUUID } from "node:crypto";
import { expect, test as base, type APIRequestContext, type Page } from "@playwright/test";

export const ORIGIN = "http://localhost:3210";
export const PASSWORD = "correct-horse-battery";

export const newEmail = () => `${randomUUID()}@nexus.test`;

export async function signUp(request: APIRequestContext, email = newEmail(), name = "Brandon") {
  const res = await request.post("/api/auth/sign-up/email", { headers: { origin: ORIGIN }, data: { name, email, password: PASSWORD } });
  expect(res.ok(), await res.text()).toBe(true);
  return email;
}

/** Signs in a fresh account for each test, fails on any page error, and skips the first-run tour unless asked. */
export const test = base.extend<{ tour: boolean; signedIn: boolean; errors: string[] }>({
  tour: [false, { option: true }],
  signedIn: [true, { option: true }],
  errors: [
    async ({ context, page, tour, signedIn }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        // A failed chat request is logged by the browser and handled by the app.
        if (m.type() === "error" && !m.text().includes("Failed to load resource")) errors.push(m.text());
      });
      // Each test looks like its own visitor, so they don't trip the sign-in rate limit.
      await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(256)}` });
      if (signedIn) {
        await signUp(context.request);
        if (!tour) {
          const res = await context.request.put("/api/workspace", { headers: { origin: ORIGIN }, data: { state: { tourDone: true }, version: 0 } });
          expect(res.ok()).toBe(true);
        }
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
