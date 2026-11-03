/** The GitHub Pages build has no server, so it uses demo replies and browser storage, with no accounts. */
export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

export const AI_LIMIT_MESSAGE = "You've used today's AI allowance on the Free plan. Upgrade to Pro in Settings for more.";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/** When a memory was saved, as "8:15 AM" for today or a day label otherwise. */
export function memoryWhen(m: { daysAgo: number; time?: string; at?: number }, now = new Date()) {
  if (m.at === undefined) return m.daysAgo === 0 ? m.time : dayLabel(m.daysAgo);
  const saved = new Date(m.at);
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(now) - midnight(saved)) / 86_400_000);
  return days === 0 ? saved.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : dayLabel(days);
}

/** How long ago a memory was saved, in whole days. */
export const memoryAge = (m: { daysAgo: number; at?: number }) => (m.at === undefined ? m.daysAgo : Math.floor((Date.now() - m.at) / 86_400_000));

/** A seeded `{ daysAgo }` stamp stays recent no matter when the app is opened. */
export function dayLabel(daysAgo: number) {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function timeAgo(ts: number | string) {
  if (typeof ts === "string") return ts;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Monday = 0 */
export function weekdayIndex(date = new Date()) {
  return (date.getDay() + 6) % 7;
}

/** Catmull-Rom spline through evenly spaced points, returned as an SVG path. */
export function smoothPath(points: [number, number][]) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }
  return d;
}
