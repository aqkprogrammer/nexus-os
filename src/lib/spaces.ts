import { currentUser } from "./auth";
import { prisma } from "./db";
import { sameOrigin } from "./request";

export const ROLES = ["owner", "editor", "viewer"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2 };
export const INVITE_DAYS = 14;

export interface SharedGoal {
  title: string;
  milestones: { id: string; title: string; done: boolean }[];
}

export interface SharedEvent {
  title: string;
  day: number;
  start: number;
  duration: number;
}

/**
 * The signed-in user and their role in the space, if it's at least `need`.
 * A space you're not in reads as missing, so its existence isn't revealed.
 */
export async function spaceAccess(req: Request, spaceId: string, need: Role) {
  if (req.method !== "GET" && !sameOrigin(req)) return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  const user = await currentUser(req);
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const member = await prisma.spaceMember.findUnique({ where: { spaceId_userId: { spaceId, userId: user.id } } });
  if (!member) return { error: Response.json({ error: "not_found" }, { status: 404 }) };
  const role = member.role as Role;
  if (RANK[role] < RANK[need]) return { error: Response.json({ error: "Only an " + need + " can do that." }, { status: 403 }) };
  return { user, role };
}

const text = (v: unknown, max = 200): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const between = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

/** Checks shared data before it's stored, since every member's app will read it. */
export function parseItem(kind: unknown, data: unknown): { kind: "goal"; data: SharedGoal } | { kind: "event"; data: SharedEvent } | null {
  const d = (data ?? {}) as Record<string, unknown>;
  if (kind === "goal") {
    const steps = Array.isArray(d.milestones) ? d.milestones : [];
    if (!text(d.title) || steps.length > 20) return null;
    const milestones = steps.map((m: Record<string, unknown>) => ({ id: String(m?.id ?? ""), title: m?.title, done: m?.done === true }));
    if (!milestones.every((m) => text(m.id, 40) && text(m.title))) return null;
    return { kind, data: { title: d.title.trim(), milestones: milestones as SharedGoal["milestones"] } };
  }
  if (kind === "event") {
    if (!text(d.title) || !Number.isInteger(d.day) || !between(d.day, 0, 6) || !between(d.start, 0, 23.75) || !between(d.duration, 0.25, 12)) return null;
    return { kind, data: { title: d.title.trim(), day: d.day, start: d.start, duration: d.duration } };
  }
  return null;
}
