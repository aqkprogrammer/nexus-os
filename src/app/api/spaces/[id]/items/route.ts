import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { parseItem, spaceAccess } from "@/lib/spaces";

type Ctx = { params: Promise<{ id: string }> };

const MAX_ITEMS = 500;

/** The space's shared goals and events. Any member can read them. */
export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { error } = await spaceAccess(req, id, "viewer");
  if (error) return error;
  const items = await prisma.spaceItem.findMany({ where: { spaceId: id }, orderBy: { updatedAt: "asc" }, select: { id: true, kind: true, data: true } });
  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

/** Adds a shared goal or event. Editors and the owner only. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { user, error } = await spaceAccess(req, id, "editor");
  if (error) return error;

  const body = ((await req.json().catch(() => null)) ?? {}) as { kind?: unknown; data?: unknown };
  const item = parseItem(body.kind, body.data);
  if (!item) return Response.json({ error: "invalid_request" }, { status: 400 });
  if ((await prisma.spaceItem.count({ where: { spaceId: id } })) >= MAX_ITEMS) return Response.json({ error: "This space is full." }, { status: 400 });

  const created = await prisma.spaceItem.create({
    data: { spaceId: id, kind: item.kind, data: item.data as unknown as Prisma.InputJsonObject, createdBy: user.id },
    select: { id: true, kind: true, data: true },
  });
  return Response.json({ item: created });
}
