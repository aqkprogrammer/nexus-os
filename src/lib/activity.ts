/** A dated record of something the user did, kept so analytics can look back over months. */
export interface ActivityEntry {
  /** Unique per account, so the same check-in or completion is never counted twice. */
  key: string;
  kind: ActivityKind;
  title: string;
  at: number;
}

export const ACTIVITY_KINDS = ["task", "milestone", "approved", "declined", "checkin", "agent", "workflow"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export interface History {
  entries: ActivityEntry[];
  /** Focus hours scheduled each week, keyed by that week's Monday. */
  focusWeeks: Record<string, number>;
  /** When the account was created. Earlier periods have no data rather than zero. */
  since: number;
}

export const emptyHistory = (): History => ({ entries: [], focusWeeks: {}, since: Date.now() });

export const DAY_MS = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** A local calendar date as YYYY-MM-DD. */
export function dayKey(date: Date | number) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(date: Date | number) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Midnight on the Monday of the week that contains `date`. */
export function startOfWeek(date: Date | number) {
  const d = new Date(startOfDay(date));
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

export const weekKey = (date: Date | number) => dayKey(startOfWeek(date));

/** Moves a date by whole days on the calendar, so daylight saving changes don't shift it. */
export function shiftDays(date: Date | number, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** The date of a weekday (0 is Monday) in the current week, at noon so it never slips across midnight. */
export function dateOfWeekday(day: number, now = Date.now()) {
  const d = new Date(startOfWeek(now));
  d.setDate(d.getDate() + day);
  d.setHours(12);
  return d.getTime();
}
