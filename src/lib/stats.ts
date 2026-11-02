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
}

const focusHours = (events: CalEvent[]) => events.filter((e) => FOCUS_AREAS.includes(e.area)).reduce((sum, e) => sum + e.duration, 0);
const approved = (history: ActionRecord[]) => history.filter((h) => h.outcome === "approved").length;
const milestonesDone = (goals: Goal[]) => goals.reduce((sum, g) => sum + g.milestones.filter((m) => m.done).length, 0);
const workflowRuns = (workflows: Workflow[]) => workflows.reduce((sum, w) => sum + w.runs, 0);

export function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** The seeded baseline plus everything the user has actually done since. */
export function liveStats(a: Activity, range: RangeKey) {
  const base = RANGES[range];

  const tasks =
    base.tasks +
    a.priorities.filter((p) => p.done).length -
    SEED_PRIORITIES.filter((p) => p.done).length +
    approved(a.history) -
    approved(SEED_HISTORY) +
    milestonesDone(a.goals) -
    milestonesDone(SEED_GOALS);

  const agentRuns = a.runs.filter((r) => r.status === "done").length;
  const extraWorkflowRuns = Math.max(0, workflowRuns(a.workflows) - workflowRuns(SEED_WORKFLOWS));
  const savedMinutes =
    base.savedMinutes +
    Math.max(0, approved(a.history) - approved(SEED_HISTORY)) * MINUTES_SAVED.approval +
    agentRuns * MINUTES_SAVED.agentRun +
    extraWorkflowRuns * MINUTES_SAVED.workflowRun;

  const addedFocus = focusHours(a.events) - focusHours(SEED_EVENTS);
  const focus = Math.max(0, base.focus + addedFocus);
  const previous = base.focus / (1 + base.focusDelta / 100);
  const series = base.series.map((v, i, all) => (i === all.length - 1 ? Math.max(0, v + addedFocus) : v));

  const completion = a.goals.length ? Math.round(a.goals.reduce((sum, g) => sum + goalProgress(g), 0) / a.goals.length) : 0;

  return {
    ...base,
    focus,
    focusDelta: Math.round((focus / previous - 1) * 100),
    tasks: Math.max(0, tasks),
    savedMinutes,
    saved: formatMinutes(savedMinutes),
    completion,
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
  return useMemo(() => liveStats({ priorities, history, goals, events, workflows, runs }, range), [priorities, history, goals, events, workflows, runs, range]);
}
