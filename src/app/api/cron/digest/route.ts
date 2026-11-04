import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { dailyDigest, localTime, weeklyDigest, type DigestState } from "@/lib/digest";
import { emailConfigured, sendEmail, type Email } from "@/lib/email";

const DAILY_HOUR = 7;
const BATCH = 200;

/**
 * Confirmed addresses that have a summary turned on, a batch at a time, so memory stays flat as accounts grow.
 * Confirmed only, so a mistyped email at sign-up never gets someone else's summaries.
 */
async function* wantingSummaries() {
  let cursor: string | undefined;
  for (;;) {
    const page = await prisma.workspace.findMany({
      where: {
        user: { emailVerified: true },
        OR: [{ state: { path: ["prefs", "emailDigest"], equals: true } }, { state: { path: ["prefs", "weeklyReview"], equals: true } }],
      },
      select: { userId: true, state: true, user: { select: { email: true } } },
      orderBy: { userId: "asc" },
      take: BATCH,
      ...(cursor && { cursor: { userId: cursor }, skip: 1 }),
    });
    yield* page;
    if (page.length < BATCH) return;
    cursor = page[page.length - 1].userId;
  }
}
const WEEKLY_HOUR = 18;
const SUNDAY = 6;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return !!secret && given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Sends each summary at the user's own local time. Run it every hour; each email goes out once.
 * `?at=` sets the time to check, so the schedule can be tested. It needs the same secret.
 */
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const at = new URL(req.url).searchParams.get("at");
  const now = at ? new Date(at) : new Date();
  if (Number.isNaN(now.getTime())) return Response.json({ error: "invalid_request" }, { status: 400 });
  const appUrl = process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;

  let sent = 0;
  let failed = 0;

  for await (const w of wantingSummaries()) {
    const state = (w.state ?? {}) as DigestState;
    if (state.sample) continue;
    const local = localTime(now, state.timezone);
    let kind: "daily" | "weekly" | null = null;
    if (state.prefs?.emailDigest && local.hour === DAILY_HOUR) kind = "daily";
    if (state.prefs?.weeklyReview && local.weekday === SUNDAY && local.hour === WEEKLY_HOUR) kind = "weekly";
    if (!kind) continue;

    // Claims the email first, so two runs at once can't both send it.
    const { count } = await prisma.emailLog.createMany({ data: [{ userId: w.userId, kind, period: local.date }], skipDuplicates: true });
    if (!count) continue;

    let email: Email;
    if (kind === "daily") {
      email = dailyDigest(state, w.user.email, local, appUrl);
    } else {
      const since = new Date(now.getTime() - 7 * 86_400_000);
      const recent = await prisma.activity.groupBy({ by: ["kind"], where: { userId: w.userId, at: { gte: since } }, _count: true });
      const of = (...kinds: string[]) => recent.filter((r) => kinds.includes(r.kind)).reduce((sum, r) => sum + r._count, 0);
      email = weeklyDigest(state, w.user.email, { tasks: of("task", "milestone", "approved"), checkins: of("checkin"), agentRuns: of("agent") }, appUrl);
    }

    try {
      await sendEmail(email);
      sent++;
    } catch (e) {
      console.error("Summary email failed:", e);
      failed++;
      // Lets the next run try again.
      await prisma.emailLog.delete({ where: { userId_kind_period: { userId: w.userId, kind, period: local.date } } });
    }
  }
  return Response.json({ sent, failed });
}
