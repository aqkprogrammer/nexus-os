import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { googleConfigured } from "@/lib/google";
import { sameOrigin } from "@/lib/request";

/** Whether Google can be connected on this server, and whether this account has done it. */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const linked = await prisma.account.findFirst({ where: { userId: user.id, providerId: "google" }, select: { scope: true } });
  return Response.json({ configured: googleConfigured(), connected: !!linked });
}

/** Disconnects Google, deleting its tokens. Signing in with email and password is unaffected. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  await prisma.account.deleteMany({ where: { userId: user.id, providerId: "google" } });
  return Response.json({ ok: true });
}
