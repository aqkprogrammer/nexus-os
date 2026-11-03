import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

const MAX_SPACES = 20;

/** Every space the user belongs to, with its members. Owners also see pending invitations. */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const memberships = await prisma.spaceMember.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: {
      space: {
        include: {
          members: { include: { user: { select: { name: true, email: true } } }, orderBy: { joinedAt: "asc" } },
          invites: { where: { acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  const spaces = memberships.map(({ role, space }) => ({
    id: space.id,
    name: space.name,
    role,
    members: space.members.map((m) => ({ userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, you: m.userId === user.id })),
    invites: role === "owner" ? space.invites.map((i) => ({ id: i.id, email: i.email, role: i.role, token: i.token })) : [],
  }));
  return Response.json({ spaces }, { headers: { "Cache-Control": "no-store" } });
}

/** Creates a space, with the user as its owner. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { name } = ((await req.json().catch(() => null)) ?? {}) as { name?: unknown };
  if (typeof name !== "string" || !name.trim() || name.length > 60) return Response.json({ error: "Give the space a name." }, { status: 400 });
  if ((await prisma.space.count({ where: { ownerId: user.id } })) >= MAX_SPACES) return Response.json({ error: "You've reached the limit of spaces." }, { status: 400 });

  const space = await prisma.space.create({ data: { name: name.trim(), ownerId: user.id, members: { create: { userId: user.id, role: "owner" } } } });
  return Response.json({ id: space.id });
}
