import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pushConfigured } from "@/lib/push";
import { sameOrigin } from "@/lib/request";

const MAX_DEVICES = 20;

interface Subscription {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

async function authorize(req: Request) {
  if (!sameOrigin(req)) return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  if (!pushConfigured()) return { error: Response.json({ error: "not_configured" }, { status: 503 }) };
  const user = await currentUser(req);
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  return { user };
}

/** The push services browsers use. Anything else is refused, so the server only ever sends to these. */
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/];

const isPushService = (url: unknown): url is string => {
  try {
    const u = new URL(String(url));
    // Tests point at a local stand-in for these services.
    if (process.env.PUSH_ALLOW_HTTP === "1") return true;
    return u.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(u.hostname));
  } catch {
    return false;
  }
};

/** Turns push on for this browser. */
export async function POST(req: Request) {
  const { user, error } = await authorize(req);
  if (error) return error;

  const { endpoint, keys } = ((await req.json().catch(() => null)) ?? {}) as Subscription;
  if (!isPushService(endpoint) || typeof keys?.p256dh !== "string" || typeof keys.auth !== "string" || endpoint.length > 1000) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  if ((await prisma.pushDevice.count({ where: { userId: user.id } })) >= MAX_DEVICES) {
    return Response.json({ error: "Too many devices. Turn push off on one first." }, { status: 400 });
  }

  // An endpoint belongs to one browser, so it moves to whoever signed in there last.
  await prisma.pushDevice.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  return Response.json({ ok: true });
}

/** Turns push off for this browser. */
export async function DELETE(req: Request) {
  const { user, error } = await authorize(req);
  if (error) return error;
  const { endpoint } = ((await req.json().catch(() => null)) ?? {}) as Subscription;
  if (typeof endpoint !== "string") return Response.json({ error: "invalid_request" }, { status: 400 });
  await prisma.pushDevice.deleteMany({ where: { userId: user.id, endpoint } });
  return Response.json({ ok: true });
}
