import { goalProgress, type CalEvent, type Goal, type Priority } from "./data";
import type { Email } from "./email";

/** The parts of a saved workspace a summary reads. Saved JSON can be anything, so every field is optional. */
export interface DigestState {
  profile?: { name?: string };
  prefs?: { emailDigest?: boolean; weeklyReview?: boolean };
  timezone?: string;
  sample?: boolean;
  priorities?: Priority[];
  events?: CalEvent[];
  goals?: Goal[];
  actions?: unknown[];
}

export interface LocalTime {
  /** YYYY-MM-DD in the user's time zone. */
  date: string;
  hour: number;
  /** 0 is Monday, like the planner. */
  weekday: number;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** The user's local date, hour and weekday at `at`. Falls back to UTC for an unknown time zone. */
export function localTime(at: Date, timezone = "UTC"): LocalTime {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(at);
  } catch {
    return localTime(at, "UTC");
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")), weekday: WEEKDAYS.indexOf(get("weekday")) };
}

const clock = (start: number) => {
  const h = Math.floor(start);
  const m = Math.round((start - h) * 60);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
};

const list = (items: string[]) => items.map((i) => `• ${i}`).join("\n");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function dailyDigest(state: DigestState, to: string, now: LocalTime, appUrl: string): Email {
  const name = state.profile?.name || "there";
  const open = (state.priorities ?? []).filter((p) => !p.done);
  const events = (state.events ?? []).filter((e) => e.day === now.weekday).sort((a, b) => a.start - b.start);
  const waiting = (state.actions ?? []).length;

  const sections = [`Good morning, ${name}. Here's your ${DAY_NAMES[now.weekday]}.`];
  sections.push(events.length ? `On your calendar\n\n${list(events.map((e) => `${clock(e.start)}: ${e.title}`))}` : "Nothing on your calendar today.");
  sections.push(open.length ? `Your priorities\n\n${list(open.slice(0, 5).map((p) => p.title))}` : "No open priorities. A good day to plan ahead.");
  if (waiting) sections.push(`${plural(waiting, "result")} from your agents ${waiting === 1 ? "is" : "are"} waiting for your approval.`);

  return { to, subject: `Your ${DAY_NAMES[now.weekday]} brief`, body: sections.join("\n\n"), action: { label: "Open NEXUS OS", url: appUrl } };
}

export function weeklyDigest(state: DigestState, to: string, done: { tasks: number; checkins: number; agentRuns: number }, appUrl: string): Email {
  const name = state.profile?.name || "there";
  const goals = (state.goals ?? []).filter((g) => Array.isArray(g.milestones));
  const sections = [
    `Here's your week, ${name}.`,
    list([`${plural(done.tasks, "task")} finished`, `${plural(done.checkins, "routine check-in")}`, `${plural(done.agentRuns, "agent run")}`]),
  ];
  if (goals.length) sections.push(`Your goals\n\n${list(goals.slice(0, 5).map((g) => `${g.title}: ${goalProgress(g)}%`))}`);
  sections.push("Take a few minutes to plan next week while it's fresh.");
  return { to, subject: "Your weekly review", body: sections.join("\n\n"), action: { label: "Plan next week", url: `${appUrl}/planner` } };
}
