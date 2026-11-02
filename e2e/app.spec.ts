import { ask, chat, expect, nav, test } from "./helpers";

const ROUTES: [string, string][] = [
  ["AI Brain", "AI Brain"],
  ["AI Agents", "AI Agents"],
  ["Life Planner", "Life Planner"],
  ["Life Analytics", "Life Analytics"],
  ["Automation Hub", "Automation Hub"],
  ["Goal Intelligence", "Goal Intelligence"],
  ["Actions", "Actions"],
  ["Privacy", "Privacy Vault"],
  ["Settings", "Settings"],
];

test("dashboard shows every numbered card and fits the screen", async ({ page }) => {
  await page.goto("/");
  for (const title of ["Morning Brief", "Action Center", "Life Analytics", "Goal Intelligence", "Memory Timeline", "Agent Team", "Idea Vault", "Privacy Vault", "Automation Hub", "Daily Insight"]) {
    await expect(page.getByRole("heading", { name: title, level: 2 })).toBeVisible();
  }
  const main = page.locator("main");
  await expect.poll(() => main.evaluate((el) => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("the sidebar reaches every module", async ({ page }) => {
  await page.goto("/");
  for (const [link, heading] of ROUTES) {
    await nav(page, link).click();
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
});

test("reviewing an action updates the badge and history", async ({ page }) => {
  await page.goto("/");
  await expect(nav(page, "Actions")).toContainText("8");
  await page.getByRole("button", { name: "Review", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(nav(page, "Actions")).toContainText("7");

  await nav(page, "Actions").click();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.locator("main")).toContainText("Cancel Adobe Subscription");
});

test("launching an agent produces a result to review", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch an Agent" }).click();
  await page.getByLabel(/What should/).fill("Plan my next week");
  await page.getByRole("button", { name: /^Launch / }).last().click();
  await expect(nav(page, "Actions")).toContainText("9", { timeout: 12_000 });
  await expect(page.locator("#tour-actions")).toContainText("Plan my next week");
});

test("changes survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("checkbox", { name: "Follow up with Laura" }).click();
  await expect(page.getByRole("checkbox", { name: "Follow up with Laura" })).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "Follow up with Laura" })).toBeChecked();
});

test("the search palette opens from the keyboard and navigates", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder("Search pages, agents, goals, memories...").fill("Life Planner");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/planner/);
});

test.describe("analytics stay in step with what you do", () => {
  test("completing a task raises tasks done", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Life Analytics" }) });
    await expect(card).toContainText("47");
    await page.getByRole("checkbox", { name: "Workout & Wellness" }).click();
    await expect(card).toContainText("48");
  });

  test("the calendar drives the time chart", async ({ page }) => {
    await page.goto("/analytics");
    const balance = page.locator("section").filter({ has: page.getByRole("heading", { name: "Weekly Balance" }) });
    const health = balance.getByRole("listitem").filter({ hasText: "Health" });
    await expect(health).toContainText("4 hrs");

    await nav(page, "Life Planner").click();
    await page.getByRole("button", { name: "Add event Tue at 7am" }).click();
    await page.getByLabel("Title").fill("Morning swim");
    await page.getByLabel("Life area").selectOption("Health");
    await page.getByRole("button", { name: "Add event", exact: true }).click();

    await nav(page, "Life Analytics").click();
    await expect(page.locator("section").filter({ has: page.getByRole("heading", { name: "Weekly Balance" }) }).getByRole("listitem").filter({ hasText: "Health" })).toContainText("5 hrs");
  });
});

test.describe("planner drag and drop", () => {
  test("dragging moves an event to another day and time", async ({ page }) => {
    await page.goto("/planner");
    const event = page.locator('[data-event="Team stand-up"]');
    await expect(event).toBeVisible();
    const box = (await event.boundingBox())!;
    const dayWidth = (await page.locator('[data-event="Team stand-up"]').evaluate((el) => (el.parentElement as HTMLElement).offsetWidth)) / 7;
    const hour = await page.evaluate(() => 2.5 * parseFloat(getComputedStyle(document.documentElement).fontSize));

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dayWidth, box.y + box.height / 2 + hour * 2, { steps: 12 });
    await page.mouse.up();

    await expect(event).toHaveAttribute("aria-label", /Team stand-up, Tue at 1pm/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("clicking without dragging still opens the event", async ({ page }) => {
    await page.goto("/planner");
    await page.locator('[data-event="Team stand-up"]').click();
    await expect(page.getByRole("dialog")).toContainText("Team stand-up");
  });

  test("arrow keys move a focused event", async ({ page }) => {
    await page.goto("/planner");
    const event = page.locator('[data-event="Team stand-up"]');
    await event.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(event).toHaveAttribute("aria-label", /Team stand-up, Tue at 12pm/);
  });
});

test.describe("undo", () => {
  test("restores a deleted memory in its original place", async ({ page }) => {
    await page.goto("/brain");
    await page.getByRole("button", { name: "Delete Uploaded receipt - Costco" }).click();
    await expect(page.getByRole("button", { name: "Delete Uploaded receipt - Costco" })).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByRole("button", { name: "Delete Uploaded receipt - Costco" })).toBeVisible();
  });

  test("brings back all memories after erasing them", async ({ page }) => {
    await page.goto("/privacy");
    await page.getByRole("button", { name: "Erase all memories" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Erase memories" }).click();
    await expect(page.locator("main")).toContainText("0 memories stored");
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator("main")).toContainText("11 memories stored");
  });

  test("restores a removed calendar event", async ({ page }) => {
    await page.goto("/planner");
    await page.locator('[data-event="Team stand-up"]').click();
    await page.getByRole("button", { name: "Remove event" }).click();
    await expect(page.locator('[data-event="Team stand-up"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.locator('[data-event="Team stand-up"]')).toBeVisible();
  });
});

test.describe("first-run tour", () => {
  test.use({ tour: true });

  test("walks through the app once, then stays out of the way", async ({ page }) => {
    await page.goto("/");
    const tour = page.getByRole("dialog", { name: "Welcome tour" });
    await expect(tour).toContainText("Hi, I'm Nexus!");
    await page.getByRole("button", { name: "Show me" }).click();
    for (const title of ["Talk to me here", "You stay in control", "Meet your agent team", "Turn goals into plans"]) {
      await expect(tour).toContainText(title);
      await page.getByRole("button", { name: "Next" }).click();
    }
    await expect(tour).toContainText("Find anything fast");
    await page.getByRole("button", { name: "Get started" }).click();
    await expect(tour).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(tour).toHaveCount(0);
  });

  test("can be skipped and replayed from Settings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip" }).click();
    await nav(page, "Settings").click();
    await page.getByRole("button", { name: "Replay tour" }).click();
    await expect(page.getByRole("dialog", { name: "Welcome tour" })).toBeVisible();
  });
});

test.describe("AI chat", () => {
  test("streams a reply from the server", async ({ page }) => {
    await page.goto("/");
    await ask(page, "hello");
    await expect(chat(page)).toContainText("Hello from the real chat pipeline.");
    await expect(chat(page)).toContainText("Your AI Companion");
  });

  test("tool calls change the workspace", async ({ page }) => {
    await page.goto("/planner");
    await nav(page, "Home").click();
    await ask(page, "please add a task");
    await expect(chat(page)).toContainText("Added it to your list.");
    await chat(page).getByRole("link", { name: /Open planner/ }).click();
    await expect(page.locator("#today")).toContainText("Book flights");
  });

  test("Stop ends a reply early", async ({ page }) => {
    await page.goto("/");
    await ask(page, "long reply");
    await expect(chat(page)).toContainText("word5");
    await page.getByRole("button", { name: "Stop reply" }).click();
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(chat(page)).not.toContainText("word199");
  });

  test("a failed reply can be retried", async ({ page }) => {
    await page.goto("/");
    await ask(page, "server error");
    await expect(chat(page)).toContainText("couldn't reach the AI service", { timeout: 15_000 });
    await chat(page).getByRole("button", { name: "Try again" }).click();
    await expect(chat(page).getByRole("button", { name: "Try again" })).toHaveCount(1, { timeout: 15_000 });
  });

  test("falls back to labelled demo replies without a key", async ({ page }) => {
    await page.route("**/api/chat", (route) => route.fulfill({ status: 503, json: { error: "not_configured" } }));
    await page.goto("/");
    await ask(page, "what's my agenda today?");
    await expect(chat(page)).toContainText("Demo replies");
    await expect(chat(page).getByRole("button", { name: "Try again" })).toHaveCount(0);
  });
});
