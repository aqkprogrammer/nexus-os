import { CALENDAR_API, googleGet, googleSession } from "@/lib/google";

interface GoogleEvent {
  id: string;
  summary?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

const MAX_RANGE_MS = 8 * 86_400_000;

/** Events from the user's main Google Calendar between `from` and `to`. Read only. */
export async function GET(req: Request) {
  const { token, error } = await googleSession(req);
  if (error) return error;

  const params = new URL(req.url).searchParams;
  const from = new Date(params.get("from") ?? "");
  const to = new Date(params.get("to") ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const query = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "250" });
  try {
    const { items = [] } = await googleGet<{ items?: GoogleEvent[] }>(`${CALENDAR_API}/calendars/primary/events?${query}`, token);
    const events = items
      .filter((e) => e.status !== "cancelled" && e.start && e.end)
      .map((e) => ({
        id: e.id,
        title: e.summary || "(No title)",
        start: e.start!.dateTime ?? e.start!.date!,
        end: e.end!.dateTime ?? e.end!.date!,
        allDay: !e.start!.dateTime,
      }));
    return Response.json({ events });
  } catch (e) {
    console.error("Google Calendar failed:", e);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
