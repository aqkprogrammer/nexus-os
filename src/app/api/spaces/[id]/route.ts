import { prisma } from "@/lib/db";
import { spaceAccess } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string }> };

/** Renames the space. Owner only. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await spaceAccess(req, id, "owner");
  if (error) return error;
  const { name } = ((await req.json().catch(() => null)) ?? {}) as { name?: unknown };
  if (typeof name !== "string" || !name.trim() || name.length > 60) return Response.json({ error: "Give the space a name." }, { status: 400 });
  await prisma.space.update({ where: { id }, data: { name: name.trim() } });
  return Response.json({ ok: true });
}

/** Deletes the space and everything in it, for every member. Owner only. */
export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await spaceAccess(req, id, "owner");
  if (error) return error;
  await prisma.space.delete({ where: { id } });
  return Response.json({ ok: true });
}
