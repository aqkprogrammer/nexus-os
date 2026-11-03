import { prisma } from "@/lib/db";
import { spaceAccess } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string; userId: string }> };

/** Changes a member between editor and viewer. Owner only, and never the owner's own role. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, userId } = await ctx.params;
  const { user, error } = await spaceAccess(req, id, "owner");
  if (error) return error;
  if (userId === user.id) return Response.json({ error: "The owner stays the owner." }, { status: 400 });

  const { role } = ((await req.json().catch(() => null)) ?? {}) as { role?: unknown };
  if (role !== "editor" && role !== "viewer") return Response.json({ error: "Choose editor or viewer." }, { status: 400 });
  const { count } = await prisma.spaceMember.updateMany({ where: { spaceId: id, userId }, data: { role } });
  return count ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
}

/** The owner removes someone, or a member leaves. The owner deletes the space instead of leaving it. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id, userId } = await ctx.params;
  const { user, role, error } = await spaceAccess(req, id, "viewer");
  if (error) return error;

  const leaving = userId === user.id;
  if (leaving && role === "owner") return Response.json({ error: "Delete the space instead, or it would have no owner." }, { status: 400 });
  if (!leaving && role !== "owner") return Response.json({ error: "Only the owner can remove people." }, { status: 403 });
  await prisma.spaceMember.deleteMany({ where: { spaceId: id, userId } });
  return Response.json({ ok: true });
}
