import type { Page } from "@playwright/test";
import { expect, ORIGIN, signUp, test } from "./helpers";

// A 1x1 PNG.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const library = (page: Page) => page.locator("section").filter({ has: page.getByRole("heading", { name: "Memory Library" }) });
const choose = (page: Page, file: { name: string; mimeType: string; buffer: Buffer }) => page.getByLabel("Upload files").setInputFiles(file);

test("with AI, an upload becomes a memory of what's in it, and the file can be downloaded", async ({ page }) => {
  await page.goto("/brain");
  await choose(page, { name: "receipt.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Read and saved: Receipt - Costco")).toBeVisible({ timeout: 10_000 });

  const row = library(page).locator("li").filter({ hasText: "$184.20 on household supplies" });
  const link = row.getByRole("link", { name: "Download the file for Receipt - Costco" });
  const res = await page.request.get((await link.getAttribute("href"))!);
  expect(res.headers()["content-disposition"]).toContain("attachment");
  expect(Buffer.from(await res.body()).equals(PNG)).toBe(true);
});

test("if AI can't read a file, it's still kept with a preview", async ({ page }) => {
  await page.goto("/brain");
  await choose(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Boiler code is 4471. Engineer visits in March.") });
  await expect(page.getByText(/Saved: notes/)).toBeVisible({ timeout: 10_000 });
  await expect(library(page)).toContainText("Boiler code is 4471");
});

test("unsafe and oversized files are refused", async ({ page }) => {
  await page.goto("/brain");
  await choose(page, { name: "page.html", mimeType: "text/html", buffer: Buffer.from("<script>alert(1)</script>") });
  await expect(page.getByText("That type of file isn't supported")).toBeVisible();
  await choose(page, { name: "huge.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(5 * 1024 * 1024) });
  await expect(page.getByText("huge.pdf is over 4 MB")).toBeVisible();
});

test("nobody else can download your files", async ({ browser, page }) => {
  await page.goto("/brain");
  await choose(page, { name: "receipt.png", mimeType: "image/png", buffer: PNG });
  const link = library(page).getByRole("link", { name: /Download the file for/ }).first();
  const href = (await link.getAttribute("href"))!;

  const stranger = await browser.newContext({ baseURL: ORIGIN, extraHTTPHeaders: { "x-forwarded-for": "10.7.7.7" } });
  await signUp(stranger.request);
  expect((await stranger.request.get(href)).status()).toBe(404);
  await stranger.close();
});
