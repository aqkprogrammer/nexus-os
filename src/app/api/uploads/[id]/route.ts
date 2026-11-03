import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Downloads one of the signed-in user's files. Always as an attachment, so nothing in it runs in the app. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const file = await prisma.upload.findFirst({ where: { id, userId: user.id } });
  if (!file) return Response.json({ error: "not_found" }, { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.type,
      "Content-Length": String(file.size),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
