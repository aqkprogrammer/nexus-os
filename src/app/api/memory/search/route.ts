import { aiRequest } from "@/lib/ai";
import { searchMemories } from "@/lib/memory-search";

const MAX_QUERY = 300;

/** Finds memories by meaning. Without AI, AI Brain falls back to matching words. */
export async function POST(req: Request) {
  // Search is cheap, so it doesn't use up the plan's daily AI allowance.
  const { user, error } = await aiRequest(req, "memory-search", 30);
  if (error) return error;

  const { q } = ((await req.json().catch(() => null)) ?? {}) as { q?: unknown };
  if (typeof q !== "string" || !q.trim() || q.length > MAX_QUERY) return Response.json({ error: "invalid_request" }, { status: 400 });

  try {
    const matches = await searchMemories(user.id, q.trim());
    return Response.json({ matches: matches.map(({ memoryId, score }) => ({ id: memoryId, score })) });
  } catch (e) {
    console.error("Memory search failed:", e);
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
