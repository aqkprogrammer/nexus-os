import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { expect, ORIGIN, test } from "./helpers";

const MOCK = "http://127.0.0.1:3299";

/** A subscription like a browser's, pointing at the mock push service. */
function device(id: string) {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return { endpoint: `${MOCK}/push/${id}`, keys: { p256dh: ecdh.getPublicKey("base64url"), auth: randomBytes(16).toString("base64url") } };
}

const delivered = async (id: string) => Number(await (await fetch(`${MOCK}/push-log/${id}`)).text());

test("the app can be installed", async ({ page }) => {
  await page.goto("/");
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "NEXUS OS", display: "standalone" });
  expect((await page.request.get("/icon-512.png")).status()).toBe(200);
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.ready).active)).toBe(true);
});

test("a device's alerts reach the account's other devices", async ({ context }) => {
  const phone = randomUUID();
  const laptop = randomUUID();
  const headers = { origin: ORIGIN };
  for (const id of [phone, laptop]) expect((await context.request.post("/api/push", { headers, data: device(id) })).status()).toBe(200);

  const res = await context.request.post("/api/push/send", {
    headers,
    data: { title: "Planner finished", body: "Result is waiting in Action Center.", url: "/actions", skip: `${MOCK}/push/${laptop}` },
  });
  expect(await res.json()).toEqual({ sent: 1 });
  expect(await delivered(phone)).toBe(1);
  expect(await delivered(laptop)).toBe(0);
});

test("devices that unsubscribed are forgotten", async ({ context }) => {
  const headers = { origin: ORIGIN };
  await context.request.post("/api/push", { headers, data: device(`gone-${randomUUID()}`) });
  const send = () => context.request.post("/api/push/send", { headers, data: { title: "Hi", body: "", url: "/" } }).then((r) => r.json());
  expect(await send()).toEqual({ sent: 0 });
  expect(await send()).toEqual({ sent: 0 });
});

test.describe("with notifications allowed", () => {
  // Headless browsers block notifications by default, which Settings reports as blocked.
  test.use({ permissions: ["notifications"] });

  test("Settings offers push notifications for this device", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("switch", { name: "Push notifications" })).toHaveAttribute("aria-checked", "false");
  });
});
