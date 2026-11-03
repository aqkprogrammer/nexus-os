import type { Prisma } from "@/generated/prisma/client";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

const MAX_BODY_CHARS = 1_000_000;

interface SaveRequest {
  state: Prisma.InputJsonObject;
  version: number;
}

function parseBody(text: string): SaveRequest | null {
  try {
    const { state, version } = JSON.parse(text) as Partial<SaveRequest>;
    if (!state || typeof state !== "object" || Array.isArray(state)) return null;
    if (!Number.isInteger(version) || version! < 0) return null;
    return { state, version: version! };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const saved = await prisma.workspace.findUnique({ where: { userId: user.id } });
  return Response.json(
    { account: { name: user.name, email: user.email }, state: saved?.state ?? null, version: saved?.version ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });

  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) return Response.json({ error: "too_large" }, { status: 413 });

  const body = parseBody(text);
  if (!body) return Response.json({ error: "invalid_request" }, { status: 400 });

  // Only writes if the client saw the latest version, so a stale tab can't overwrite newer data.
  const { count } =
    body.version === 0
      ? await prisma.workspace.createMany({ data: [{ userId: user.id, state: body.state }], skipDuplicates: true })
      : await prisma.workspace.updateMany({
          where: { userId: user.id, version: body.version },
          data: { state: body.state, version: { increment: 1 } },
        });

  if (count === 0) {
    const latest = await prisma.workspace.findUnique({ where: { userId: user.id } });
    return Response.json({ state: latest?.state ?? null, version: latest?.version ?? 0 }, { status: 409 });
  }
  return Response.json({ version: body.version + 1 });
}
