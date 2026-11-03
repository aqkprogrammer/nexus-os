import { GMAIL_API, googleGet, googleSession } from "@/lib/google";

interface MessageRef {
  id: string;
}

interface Message {
  id: string;
  snippet?: string;
  internalDate?: string;
  payload?: { headers?: { name: string; value: string }[] };
}

const MAX_MESSAGES = 8;

/** Unread mail in the inbox from the last two days: sender, subject and a short preview. Read only. */
export async function GET(req: Request) {
  const { token, error } = await googleSession(req);
  if (error) return error;

  try {
    const query = new URLSearchParams({ q: "is:unread in:inbox newer_than:2d", maxResults: String(MAX_MESSAGES) });
    const { messages = [] } = await googleGet<{ messages?: MessageRef[] }>(`${GMAIL_API}/users/me/messages?${query}`, token);
    const details = await Promise.all(
      messages.map((m) => googleGet<Message>(`${GMAIL_API}/users/me/messages/${encodeURIComponent(m.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, token)),
    );
    const header = (m: Message, name: string) => m.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
    const mail = details.map((m) => ({
      id: m.id,
      from: header(m, "From").replace(/\s*<[^>]+>$/, "").replace(/^"|"$/g, "") || "Unknown sender",
      subject: header(m, "Subject") || "(No subject)",
      snippet: (m.snippet ?? "").slice(0, 200),
      at: Number(m.internalDate) || null,
    }));
    return Response.json({ mail });
  } catch (e) {
    console.error("Gmail failed:", e);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
