import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { rateLimited } from "@/lib/rate-limit";
import { INVITE_DAYS, spaceAccess } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string }> };

const MAX_MEMBERS = 20;
/** An invitation also lets someone create an account, so each person can only bring in so many a day. */
const NEW_INVITES_PER_DAY = 20;
const RESEND_COOLDOWN_MS = 10 * 60_000;

/** Counts one new invitation. False once today's are used up. */
async function spendInvite(userId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const { count } = await prisma.inviteCount.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, count: 1 },
    update: { count: { increment: 1 } },
  });
  return count <= NEW_INVITES_PER_DAY;
}

/** Invites someone by email. The owner gets a link to share too, in case email isn't set up. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { user, error } = await spaceAccess(req, id, "owner");
  if (error) return error;

  const { email, role } = ((await req.json().catch(() => null)) ?? {}) as { email?: unknown; role?: unknown };
  const address = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 200) return Response.json({ error: "Enter a valid email." }, { status: 400 });
  if (role !== "editor" && role !== "viewer") return Response.json({ error: "Choose editor or viewer." }, { status: 400 });

  const space = await prisma.space.findUniqueOrThrow({ where: { id }, include: { members: { include: { user: { select: { email: true } } } } } });
  if (space.members.some((m) => m.user.email.toLowerCase() === address)) return Response.json({ error: "They're already in this space." }, { status: 409 });
  if (space.members.length >= MAX_MEMBERS) return Response.json({ error: "This space is full." }, { status: 400 });

  // Inviting the same email again renews its invitation, and doesn't count as a new one.
  const pending = await prisma.spaceInvite.findFirst({ where: { spaceId: id, email: address, acceptedAt: null } });
  if (!pending && !(await spendInvite(user.id))) {
    return Response.json({ error: "You've sent today's limit of invitations. Try again tomorrow." }, { status: 429 });
  }
  const fresh = { role, token: randomBytes(24).toString("base64url"), expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) };
  const invite = pending
    ? await prisma.spaceInvite.update({ where: { id: pending.id }, data: fresh })
    : await prisma.spaceInvite.create({ data: { spaceId: id, email: address, ...fresh } });

  const link = `${process.env.BETTER_AUTH_URL ?? new URL(req.url).origin}/spaces/join?token=${invite.token}`;
  let emailed = false;
  // One email per address every few minutes, however often the button is pressed.
  if (emailConfigured() && !rateLimited(`invite-email:${user.id}:${address}`, 1, RESEND_COOLDOWN_MS)) {
    try {
      await sendEmail({
        to: address,
        subject: `${user.name} invited you to ${space.name} on NEXUS OS`,
        body: `${user.name} wants to plan together in "${space.name}". You'll see its shared goals and calendar.\n\nThe invitation works for ${INVITE_DAYS} days.`,
        action: { label: "Join the space", url: link },
      });
      emailed = true;
    } catch (e) {
      console.error("Invite email failed:", e);
    }
  }
  return Response.json({ link, emailed });
}
