"use client";

import { useMemo } from "react";
import {
  AREAS,
  DAYS,
  goalProgress,
  RANGES,
  SEED_EVENTS,
  SEED_GOALS,
  SEED_HISTORY,
  SEED_PRIORITIES,
  SEED_WORKFLOWS,
  type ActionRecord,
  type CalEvent,
  type Goal,
  type LifeArea,
  type Priority,
  type RangeKey,
  type Workflow,
} from "./data";
import { dayKey, emptyHistory, shiftDays, startOfWeek, type ActivityKind, type History } from "./activity";
import { useStore, type AgentRun } from "./store";

/** Minutes of work each kind of automated help is assumed to save. */
const MINUTES_SAVED = { approval: 20, agentRun: 15, workflowRun: 5 };
const FOCUS_AREAS: LifeArea[] = ["Work", "Learning"];

export interface Activity {
  priorities: Priority[];
  history: ActionRecord[];
  goals: Goal[];
  events: CalEvent[];
  workflows: Workflow[];
  runs: AgentRun[];
  /** True when the workspace holds the sample data, which comes with months of invented history. */
  sample: boolean;
  /** A real account's dated activity. */
  timeline?: History;
}

/** A real account's ranges are whole calendar weeks, so they line up with the weekly focus record. */
const OWN_RANGES: Record<RangeKey, { weeks: number; label: string; compare: string; note: string }> = {
  week: { weeks: 1, label: "This Week", compare: "last week", note: "this week" },
  month: { weeks: 4, label: "Last 4 Weeks", compare: "the 4 weeks before", note: "in 4 weeks" },
  quarter: { weeks: 13, label: "Last 13 Weeks", compare: "the 13 weeks before", note: "in 13 weeks" },
};

export const rangeLabel = (range: RangeKey, sample: boolean) => (sample ? RANGES : OWN_RANGES)[range].label;

export interface Stats {
  label: string;
  compare: string;
  focus: number;
  /** Null when there is no earlier period to compare with. */
  focusDelta: number | null;
  tasks: number;
  tasksNote: string;
  savedMinutes: number;
  saved: string;
  completion: number;
  series: number[];
  labels: string[];
}

export const focusHours = (events: CalEvent[]) => events.filter((e) => FOCUS_AREAS.includes(e.area)).reduce((sum, e) => sum + e.duration, 0);
const approved = (history: ActionRecord[]) => history.filter((h) => h.outcome === "approved").length;
const milestonesDone = (goals: Goal[]) => goals.reduce((sum, g) => sum + g.milestones.filter((m) => m.done).length, 0);
const workflowRuns = (workflows: Workflow[]) => workflows.reduce((sum, w) => sum + w.runs, 0);
const agentRuns = (runs: AgentRun[]) => runs.filter((r) => r.status === "done").length;
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);
const DONE_KINDS: ActivityKind[] = ["task", "milestone", "approved"];
const SAVED_BY_KIND: Partial<Record<ActivityKind, number>> = { approved: MINUTES_SAVED.approval, agent: MINUTES_SAVED.agentRun, workflow: MINUTES_SAVED.workflowRun };
const completion = (goals: Goal[]) => (goals.length ? Math.round(goals.reduce((sum, g) => sum + goalProgress(g), 0) / goals.length) : 0);

export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** A real account's figures, from its dated activity and the focus hours recorded each week. */
function ownStats(a: Activity, range: RangeKey, now = Date.now()): Stats {
  const timeline = a.timeline ?? emptyHistory();
  const { weeks, label, compare, note } = OWN_RANGES[range];
  const thisWeek = startOfWeek(now);
  const from = shiftDays(thisWeek, -7 * (weeks - 1));
  const mondays = (start: number) => Array.from({ length: weeks }, (_, i) => shiftDays(start, 7 * i));

  // The calendar repeats each week, so this week is read live and earlier weeks from the saved record.
  const focusOf = (monday: number) => (monday === thisWeek ? focusHours(a.events) : (timeline.focusWeeks[dayKey(monday)] ?? 0));
  const current = mondays(from).map(focusOf);
  const earlier = mondays(shiftDays(from, -7 * weeks)).filter((monday) => shiftDays(monday, 7) > timeline.since);
  const focus = sum(current);
  const previous = sum(earlier.map(focusOf));

  const inRange = timeline.entries.filter((e) => e.at >= from && e.at <= now);
  const savedMinutes = sum(inRange.map((e) => SAVED_BY_KIND[e.kind] ?? 0));
  const short = (monday: number) => new Date(monday).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return {
    label,
    compare,
    focus,
    focusDelta: earlier.length && previous > 0 ? Math.round((focus / previous - 1) * 100) : null,
    tasks: inRange.filter((e) => DONE_KINDS.includes(e.kind)).length,
    tasksNote: note,
    savedMinutes,
    saved: formatMinutes(savedMinutes),
    completion: completion(a.goals),
    series: weeks === 1 ? hoursByDay(a.events).map((d) => sum(FOCUS_AREAS.map((area) => d.values[area]))) : current,
    labels: weeks === 1 ? DAYS : mondays(from).map((m) => `Week of ${short(m)}`),
  };
}

/** Routine check-ins per day for the last `count` weeks, Monday first, capped at 4 for the heatmap. */
export function checkinWeeks(timeline: History, count: number, now = Date.now()) {
  const first = shiftDays(startOfWeek(now), -7 * (count - 1));
  const perDay = new Map<string, number>();
  for (const e of timeline.entries) if (e.kind === "checkin") perDay.set(dayKey(e.at), (perDay.get(dayKey(e.at)) ?? 0) + 1);
  return Array.from({ length: count }, (_, w) => Array.from({ length: 7 }, (_, d) => Math.min(4, perDay.get(dayKey(shiftDays(first, 7 * w + d))) ?? 0)));
}

/** The sample's invented baseline plus everything done since, or only the user's own data. */
export function liveStats(a: Activity, range: RangeKey): Stats {
  if (!a.sample) return ownStats(a, range);
  const base = RANGES[range];

  const tasks =
    base.tasks +
    a.priorities.filter((p) => p.done).length -
    SEED_PRIORITIES.filter((p) => p.done).length +
    approved(a.history) -
    approved(SEED_HISTORY) +
    milestonesDone(a.goals) -
    milestonesDone(SEED_GOALS);

  const extraWorkflowRuns = Math.max(0, workflowRuns(a.workflows) - workflowRuns(SEED_WORKFLOWS));
  const savedMinutes =
    base.savedMinutes +
    Math.max(0, approved(a.history) - approved(SEED_HISTORY)) * MINUTES_SAVED.approval +
    agentRuns(a.runs) * MINUTES_SAVED.agentRun +
    extraWorkflowRuns * MINUTES_SAVED.workflowRun;

  const addedFocus = focusHours(a.events) - focusHours(SEED_EVENTS);
  const focus = Math.max(0, base.focus + addedFocus);
  const previous = base.focus / (1 + base.focusDelta / 100);
  const series = base.series.map((v, i, all) => (i === all.length - 1 ? Math.max(0, v + addedFocus) : v));

  return {
    ...base,
    focus,
    focusDelta: Math.round((focus / previous - 1) * 100),
    tasks: Math.max(0, tasks),
    savedMinutes,
    saved: formatMinutes(savedMinutes),
    completion: completion(a.goals),
    series,
  };
}

/** Hours on the calendar for each day of this week, split by life area. */
export function hoursByDay(events: CalEvent[]) {
  return DAYS.map((day, index) => ({
    day,
    values: Object.fromEntries(AREAS.map((a) => [a, events.filter((e) => e.day === index && e.area === a).reduce((sum, e) => sum + e.duration, 0)])) as Record<LifeArea, number>,
  }));
}

export function useLiveStats(range: RangeKey = "week") {
  const priorities = useStore((s) => s.priorities);
  const history = useStore((s) => s.history);
  const goals = useStore((s) => s.goals);
  const events = useStore((s) => s.events);
  const workflows = useStore((s) => s.workflows);
  const runs = useStore((s) => s.runs);
  const sample = useStore((s) => s.sample);
  const timeline = useStore((s) => s.timeline);
  return useMemo(
    () => liveStats({ priorities, history, goals, events, workflows, runs, sample, timeline }, range),
    [priorities, history, goals, events, workflows, runs, sample, timeline, range],
  );
}
