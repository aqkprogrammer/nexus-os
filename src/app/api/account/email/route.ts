import { APIError } from "better-auth/api";
import { auth, currentUser } from "@/lib/auth";
import { sameOrigin } from "@/lib/request";

/** Changing the sign-in email needs the current password, so a borrowed session can't take over the account. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { newEmail, password } = ((await req.json().catch(() => null)) ?? {}) as { newEmail?: unknown; password?: unknown };
  if (typeof newEmail !== "string" || typeof password !== "string") return Response.json({ error: "invalid_request" }, { status: 400 });

  try {
    await auth.api.verifyPassword({ body: { password }, headers: req.headers });
  } catch {
    return Response.json({ error: "That password isn't right." }, { status: 403 });
  }

  try {
    await auth.api.changeEmail({ body: { newEmail: newEmail.trim() }, headers: req.headers });
  } catch (error) {
    const message = error instanceof APIError ? error.message : "Couldn't change your email.";
    return Response.json({ error: message }, { status: 400 });
  }
  return Response.json({ email: newEmail.trim().toLowerCase() });
}
