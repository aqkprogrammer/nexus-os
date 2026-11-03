/** Per-instance, so it slows abuse rather than guaranteeing a limit. Set a spend cap at OpenAI too. */
const recent = new Map<string, number[]>();

/** True when `key` has already been used `limit` times in the last `windowMs`. */
export function rateLimited(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    recent.set(key, hits);
    return true;
  }
  recent.set(key, [...hits, now]);
  if (recent.size > 5000) recent.clear();
  return false;
}
