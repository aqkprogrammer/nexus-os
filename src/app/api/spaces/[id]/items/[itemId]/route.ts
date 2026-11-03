import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseItem, spaceAccess } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** Replaces one shared item. The last person to save wins, but only for that item. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const { error } = await spaceAccess(req, id, "editor");
  if (error) return error;

  const existing = await prisma.spaceItem.findFirst({ where: { id: itemId, spaceId: id } });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });
  const { data } = ((await req.json().catch(() => null)) ?? {}) as { data?: unknown };
  const item = parseItem(existing.kind, data);
  if (!item) return Response.json({ error: "invalid_request" }, { status: 400 });

  await prisma.spaceItem.update({ where: { id: itemId }, data: { data: item.data as unknown as Prisma.InputJsonObject } });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const { error } = await spaceAccess(req, id, "editor");
  if (error) return error;
  await prisma.spaceItem.deleteMany({ where: { id: itemId, spaceId: id } });
  return Response.json({ ok: true });
}
