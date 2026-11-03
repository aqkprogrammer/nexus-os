import { agentById, DAYS, goalProgress } from "./data";
import { liveStats } from "./stats";
import type { Store } from "./store";
import { memoryAge, weekdayIndex } from "./utils";

const MAX_MEMORIES = 40;

/** A compact snapshot of the workspace. Until there's a database, the browser owns this data. */
export function buildContext(s: Store, now = new Date()) {
  const week = liveStats(s, "week");
  return {
    user: { name: s.profile.name, tone: s.profile.companionTone },
    now: {
      date: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
      time: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      day: weekdayIndex(now),
    },
    modes: { agentsOnline: s.online, safeMode: s.safeMode },
    priorities: s.priorities.map((p) => ({ title: p.title, done: p.done })),
    calendar: [...s.events]
      .sort((a, b) => a.day - b.day || a.start - b.start)
      .map((e) => ({ day: DAYS[e.day], start: e.start, hours: e.duration, title: e.title, area: e.area })),
    actionsAwaitingApproval: s.actions.map((a) => ({
      title: a.title,
      agent: agentById(a.agent).name,
      value: a.value ?? a.priority,
      summary: a.summary,
    })),
    goals: s.goals.map((g) => ({
      title: g.title,
      area: g.area,
      due: g.due,
      status: g.status,
      progressPercent: goalProgress(g),
      nextMilestone: g.milestones.find((m) => !m.done)?.title ?? null,
    })),
    memories: [...s.memories]
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || memoryAge(a) - memoryAge(b))
      .slice(0, MAX_MEMORIES)
      .map((m) => ({ title: m.title, detail: m.detail, area: m.area, type: m.type })),
    ideas: s.ideas.map((i) => i.title),
    routines: s.habits.map((h) => ({ title: h.title, streakDays: h.streak, doneThisWeek: h.week.filter(Boolean).length })),
    workflows: s.workflows.map((w) => ({ name: w.name, trigger: w.trigger, active: w.enabled })),
    // Live from Google. Email text comes from other people, so it stays inside the data block like everything else.
    googleCalendarToday: (s.google?.events ?? []).filter((e) => e.day === weekdayIndex(now)).map((e) => ({ title: e.title, start: e.start, duration: e.duration })),
    unreadEmail: (s.google?.mail ?? []).slice(0, 8).map((m) => ({ from: m.from, subject: m.subject })),
    thisWeek: { focusHours: week.focus, tasksDone: week.tasks, timeSaved: week.saved, focusChangePercent: week.focusDelta },
  };
}
