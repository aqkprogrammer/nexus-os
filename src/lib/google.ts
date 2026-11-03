import { auth, currentUser } from "./auth";
import { prisma } from "./db";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Tests point both APIs at a local stand-in. */
const BASE = process.env.GOOGLE_API_BASE;
export const CALENDAR_API = `${BASE ?? "https://www.googleapis.com"}/calendar/v3`;
export const GMAIL_API = `${BASE ?? "https://gmail.googleapis.com"}/gmail/v1`;

/** The signed-in user and a fresh Google token, or a response explaining why there isn't one. */
export async function googleSession(req: Request) {
  if (!googleConfigured()) return { error: Response.json({ error: "not_configured" }, { status: 503 }) };
  const user = await currentUser(req);
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };

  const linked = await prisma.account.findFirst({ where: { userId: user.id, providerId: "google" }, select: { id: true } });
  if (!linked) return { error: Response.json({ error: "not_connected" }, { status: 404 }) };

  try {
    // Refreshes the token first when it has expired.
    const { accessToken } = await auth.api.getAccessToken({ body: { accountId: linked.id }, headers: req.headers });
    if (!accessToken) throw new Error("No access token");
    return { user, token: accessToken };
  } catch (e) {
    console.error("Google token failed:", e);
    return { error: Response.json({ error: "reconnect" }, { status: 409 }) };
  }
}

export async function googleGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Google responded ${res.status}`);
  return (await res.json()) as T;
}
