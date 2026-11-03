import { currentUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";
import { rateLimited } from "@/lib/rate-limit";
import { sameOrigin } from "@/lib/request";

const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;

/** Lets one of the user's devices alert their others, for example when an agent's result is ready. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (rateLimited(`push:${user.id}`, 20)) return Response.json({ error: "rate_limited" }, { status: 429 });

  const { title, body, url, skip } = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  if (!text(title, 120) || !(body === "" || text(body, 300)) || !text(url, 200) || !String(url).startsWith("/")) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const sent = await sendPush(user.id, { title: String(title), body: String(body), url: String(url) }, typeof skip === "string" ? skip : undefined);
  return Response.json({ sent });
}
