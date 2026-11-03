import type { LifeArea } from "./data";
import { weekdayIndex } from "./utils";

export const CAPTURE_KINDS = ["task", "memory", "event", "idea"] as const;
export type CaptureKind = (typeof CAPTURE_KINDS)[number];

export interface Capture {
  kind: CaptureKind;
  title: string;
  area: LifeArea;
  /** For events: Monday is 0. */
  day: number;
  /** For events: hours from midnight, so 14.5 is 2:30 PM. */
  start: number;
  duration: number;
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME = /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bat\s+(\d{1,2})(?::(\d{2}))?\b/i;

const AREA_WORDS: [LifeArea, RegExp][] = [
  ["Health", /\b(gym|run|workout|yoga|doctor|dentist|swim|walk|training)\b/i],
  ["Family", /\b(mom|dad|family|kids?|sister|brother|grandma|partner|dinner with)\b/i],
  ["Learning", /\b(class|course|lesson|study|learn|read|lecture|practice)\b/i],
  ["Admin", /\b(bill|tax|bank|insurance|renew|appointment|errand|admin)\b/i],
];

const areaOf = (text: string): LifeArea => AREA_WORDS.find(([, words]) => words.test(text))?.[0] ?? "Work";

function parseTime(text: string) {
  const m = TIME.exec(text);
  if (!m) return null;
  let hour = Number(m[1] ?? m[4]);
  const minutes = Number(m[2] ?? m[5] ?? 0);
  const meridiem = m[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  // "at 3" with no am/pm most likely means the afternoon.
  if (!meridiem && hour < 8) hour += 12;
  if (hour > 23 || minutes > 59) return null;
  return { start: hour + minutes / 60, match: m[0] };
}

const tidy = (text: string) => text.replace(/\s{2,}/g, " ").replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "");
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Sorts a note without AI: a time makes it an event, "remember" a memory, "idea" an idea, and anything else a task. */
export function guessCapture(raw: string, now = new Date()): Capture {
  const text = raw.trim();
  const today = weekdayIndex(now);
  const base = { area: areaOf(text), day: today, start: 9, duration: 1 };

  if (/^(idea|what if)\b|\bidea:/i.test(text)) {
    return { ...base, kind: "idea", title: sentence(tidy(text.replace(/^(idea)\s*[:-]?\s*/i, ""))) };
  }
  if (/^(remember|note|don't forget that|keep in mind)\b/i.test(text) || /\b(prefers?|allergic|birthday is|favorite)\b/i.test(text)) {
    return { ...base, kind: "memory", title: sentence(tidy(text.replace(/^(remember( that)?|note( that)?|keep in mind( that)?)\s*/i, ""))) };
  }

  const time = parseTime(text);
  if (time) {
    let title = text.replace(time.match, " ");
    let day = today;
    if (/\btomorrow\b/i.test(title)) day = (today + 1) % 7;
    const named = WEEKDAYS.findIndex((d) => new RegExp(`\\b(on\\s+)?${d}\\b`, "i").test(title));
    if (named >= 0) day = named;
    title = title.replace(/\b(today|tomorrow|tonight)\b/gi, " ").replace(new RegExp(`\\b(on\\s+)?(${WEEKDAYS.join("|")})\\b`, "gi"), " ");
    return { ...base, kind: "event", title: sentence(tidy(title)), day, start: time.start };
  }

  return { ...base, kind: "task", title: sentence(tidy(text.replace(/^(todo|to do|task)\s*[:-]?\s*/i, ""))) };
}
