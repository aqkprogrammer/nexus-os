import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseItem, spaceAccess, type SharedGoal } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

/** Replaces one shared item. The last person to save wins, but only for that item. */
export async function PATCH(req: Request, ctx: Ctx) {
  const { id, itemId } = await ctx.params;
  const { error } = await spaceAccess(req, id, "editor");
  if (error) return error;

  const existing = await prisma.spaceItem.findFirst({ where: { id: itemId, spaceId: id } });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });
  const { data, milestone, done } = ((await req.json().catch(() => null)) ?? {}) as { data?: unknown; milestone?: unknown; done?: unknown };

  // Ticking a milestone changes only that one, with the row locked, so two people ticking at once both count.
  if (milestone !== undefined) {
    if (existing.kind !== "goal" || typeof milestone !== "string" || typeof done !== "boolean") return Response.json({ error: "invalid_request" }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const [row] = await tx.$queryRaw<{ data: SharedGoal }[]>`SELECT data FROM space_item WHERE id = ${itemId} AND "spaceId" = ${id} FOR UPDATE`;
      if (!row?.data.milestones.some((m) => m.id === milestone)) return false;
      const goal = { ...row.data, milestones: row.data.milestones.map((m) => (m.id === milestone ? { ...m, done } : m)) };
      await tx.spaceItem.update({ where: { id: itemId }, data: { data: goal as unknown as Prisma.InputJsonObject } });
      return true;
    });
    return updated ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
  }

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
