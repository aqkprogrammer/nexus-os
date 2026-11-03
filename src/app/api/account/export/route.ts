import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Everything stored for the signed-in account, as one JSON file. */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [workspace, sessions, activity, focusWeeks] = await Promise.all([
    prisma.workspace.findUnique({ where: { userId: user.id } }),
    prisma.session.findMany({ where: { userId: user.id }, select: { createdAt: true, expiresAt: true, ipAddress: true, userAgent: true } }),
    prisma.activity.findMany({ where: { userId: user.id }, select: { kind: true, title: true, at: true }, orderBy: { at: "asc" } }),
    prisma.focusWeek.findMany({ where: { userId: user.id }, select: { week: true, hours: true }, orderBy: { week: "asc" } }),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { name: user.name, email: user.email, createdAt: user.createdAt },
    sessions,
    workspace: workspace?.state ?? null,
    activity,
    focusWeeks,
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="nexus-os-export.json"',
      "Cache-Control": "no-store",
    },
  });
}
