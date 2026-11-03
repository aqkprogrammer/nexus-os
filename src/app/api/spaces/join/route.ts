import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

/** Accepts an invitation. It only works for the account with the email it was sent to. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { token } = ((await req.json().catch(() => null)) ?? {}) as { token?: unknown };
  if (typeof token !== "string" || token.length > 100) return Response.json({ error: "invalid_request" }, { status: 400 });

  const invite = await prisma.spaceInvite.findUnique({ where: { token }, include: { space: { select: { id: true, name: true } } } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) return Response.json({ error: "This invitation has expired or was already used." }, { status: 410 });
  if (invite.email !== user.email.toLowerCase()) {
    return Response.json({ error: `This invitation is for ${invite.email}. Sign in with that email to join.` }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.spaceMember.upsert({
      where: { spaceId_userId: { spaceId: invite.spaceId, userId: user.id } },
      create: { spaceId: invite.spaceId, userId: user.id, role: invite.role },
      update: {},
    }),
    prisma.spaceInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  return Response.json({ id: invite.space.id, name: invite.space.name });
}
