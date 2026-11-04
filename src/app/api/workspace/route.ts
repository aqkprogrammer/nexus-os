import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { ACTIVITY_KINDS, DAY_MS, type ActivityEntry, type ActivityKind } from "@/lib/activity";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

const MAX_BODY_CHARS = 1_000_000;
const MAX_ACTIVITY = 500;
const HISTORY_DAYS = 120;
/** The longest range is 13 weeks, compared with the 13 before it. */
const HISTORY_WEEKS = 26;

interface SaveRequest {
  state: Prisma.InputJsonObject;
  version: number;
  activity: { add: ActivityEntry[]; remove: string[] };
  focusWeek: { week: string; hours: number } | null;
}

const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

function validEntry(e: Partial<ActivityEntry>): e is ActivityEntry {
  const now = Date.now();
  return (
    isText(e.key, 200) &&
    isText(e.title, 300) &&
    ACTIVITY_KINDS.includes(e.kind as ActivityKind) &&
    Number.isFinite(e.at) &&
    e.at! > now - 400 * DAY_MS &&
    e.at! < now + 7 * DAY_MS
  );
}

function parseBody(text: string): SaveRequest | null {
  try {
    const { state, version, activity, focusWeek } = JSON.parse(text) as Partial<SaveRequest>;
    if (!state || typeof state !== "object" || Array.isArray(state)) return null;
    if (!Number.isInteger(version) || version! < 0) return null;

    const add = activity?.add ?? [];
    const remove = activity?.remove ?? [];
    if (!Array.isArray(add) || !Array.isArray(remove) || add.length > MAX_ACTIVITY || remove.length > MAX_ACTIVITY) return null;
    if (!add.every(validEntry) || !remove.every((k) => isText(k, 200))) return null;

    const week = focusWeek && /^\d{4}-\d{2}-\d{2}$/.test(focusWeek.week) && focusWeek.hours >= 0 && focusWeek.hours <= 168 ? focusWeek : null;
    return { state, version: version!, activity: { add, remove }, focusWeek: week };
  } catch {
    return null;
  }
}

/** Recent activity and focus weeks, which the client turns into analytics in the user's own time zone. */
async function history(userId: string, since: Date) {
  const [entries, weeks] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, at: { gte: new Date(Date.now() - HISTORY_DAYS * DAY_MS) } },
      select: { key: true, kind: true, title: true, at: true },
      orderBy: { at: "asc" },
    }),
    prisma.focusWeek.findMany({ where: { userId }, orderBy: { week: "desc" }, take: HISTORY_WEEKS }),
  ]);
  return {
    entries: entries.map((e) => ({ ...e, at: e.at.getTime() })),
    focusWeeks: Object.fromEntries(weeks.map((w) => [w.week, w.hours])),
    since: since.getTime(),
  };
}

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [saved, past] = await Promise.all([prisma.workspace.findUnique({ where: { userId: user.id } }), history(user.id, user.createdAt)]);
  return Response.json(
    { account: { name: user.name, email: user.email }, state: saved?.state ?? null, version: saved?.version ?? 0, history: past },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });

  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return Response.json({ error: "too_large" }, { status: 413 });

  const body = parseBody(text);
  if (!body) return Response.json({ error: "invalid_request" }, { status: 400 });
  const userId = user.id;

  const saved = await prisma.$transaction(async (tx) => {
    // Only writes if the client saw the latest version, so a stale tab can't overwrite newer data.
    const { count } =
      body.version === 0
        ? await tx.workspace.createMany({ data: [{ userId, state: body.state }], skipDuplicates: true })
        : await tx.workspace.updateMany({ where: { userId, version: body.version }, data: { state: body.state, version: { increment: 1 } } });
    if (count === 0) return false;

    const { add, remove } = body.activity;
    if (remove.length) await tx.activity.deleteMany({ where: { userId, key: { in: remove } } });
    if (add.length) {
      await tx.activity.createMany({
        data: add.map((e) => ({ userId, key: e.key, kind: e.kind, title: e.title, at: new Date(e.at) })),
        skipDuplicates: true,
      });
    }
    if (body.focusWeek) {
      const { week, hours } = body.focusWeek;
      await tx.focusWeek.upsert({ where: { userId_week: { userId, week } }, create: { userId, week, hours }, update: { hours } });
    }
    return true;
  });

  if (!saved) {
    const latest = await prisma.workspace.findUnique({ where: { userId } });
    return Response.json({ state: latest?.state ?? null, version: latest?.version ?? 0 }, { status: 409 });
  }
  after(() => removeOrphanedUploads(userId, body.state));
  return Response.json({ version: body.version + 1 });
}

/** A file outlives its memory by an hour, which covers undo and a save that hasn't landed yet. */
const ORPHAN_GRACE_MS = 60 * 60_000;

async function removeOrphanedUploads(userId: string, state: Prisma.InputJsonObject) {
  const memories = Array.isArray(state.memories) ? (state.memories as { fileId?: unknown }[]) : [];
  const kept = memories.map((m) => m?.fileId).filter((id): id is string => typeof id === "string");
  await prisma.upload.deleteMany({ where: { userId, id: { notIn: kept }, createdAt: { lt: new Date(Date.now() - ORPHAN_GRACE_MS) } } });
}
