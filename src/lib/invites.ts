/** An invitation opened before signing in, accepted once the user is in. */
export const PENDING_INVITE = "nexus-invite";

export async function acceptInvite(token: string): Promise<{ ok: true; name: string } | { ok: false; status: number; message: string }> {
  const res = await fetch("/api/spaces/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  const data = (await res.json().catch(() => ({}))) as { name?: string; error?: string };
  if (res.ok && data.name) return { ok: true, name: data.name };
  return { ok: false, status: res.status, message: data.error ?? "Couldn't join the space." };
}

/** Called once the app has loaded for a signed-in account. */
export async function acceptPendingInvite(onJoined: (name: string) => void, onError: (message: string) => void) {
  let token: string | null = null;
  try {
    token = localStorage.getItem(PENDING_INVITE);
    if (token) localStorage.removeItem(PENDING_INVITE);
  } catch {
    return;
  }
  if (!token) return;
  const result = await acceptInvite(token);
  if (result.ok) onJoined(result.name);
  else onError(result.message);
}
