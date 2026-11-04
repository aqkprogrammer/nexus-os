"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  agentById,
  RUN_STEPS,
  SEED_ACTIONS,
  SEED_EVENTS,
  SEED_GOALS,
  SEED_HABITS,
  SEED_HISTORY,
  SEED_IDEAS,
  SEED_MEMORIES,
  SEED_NOTICES,
  SEED_PERMISSIONS,
  SEED_PRIORITIES,
  SEED_WORKFLOWS,
  type ActionItem,
  type ActionRecord,
  type AgentId,
  type AppId,
  type CalEvent,
  type Goal,
  type Habit,
  type Idea,
  type Memory,
  type MemoryArea,
  type MemoryType,
  type Notice,
  type Outcome,
  type Permission,
  type Priority,
  type Repeat,
  type Workflow,
} from "./data";
import type { AgentResult } from "./agent-work";
import type { GoogleState } from "./google-client";
import { dateOfWeekday, dayKey, emptyHistory, weekKey, type ActivityEntry, type ActivityKind, type History } from "./activity";
import { isStaticDemo, uid } from "./utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  link?: { label: string; href: string };
  failed?: boolean;
}

export interface AgentRun {
  id: string;
  agent: AgentId;
  task: string;
  step: number;
  status: "running" | "done";
  at: number;
}

export interface Toast {
  id: string;
  text: string;
  tone: "good" | "info" | "warn";
  action?: { label: string; run: () => void };
}

interface Profile {
  name: string;
  role: string;
  companionTone: "Warm" | "Direct" | "Playful";
}

interface Account {
  name: string;
  email: string;
}

interface Prefs {
  ambient: boolean;
  motion: boolean;
  emailDigest: boolean;
  pushAlerts: boolean;
  weeklyReview: boolean;
}

interface Privacy {
  memoryAccess: "Only you" | "Family Circle";
  dataSharing: boolean;
  autoDelete: 30 | 90 | 365;
}

const SEED_CHAT: ChatMessage[] = [];
const MAX_SAVED_MESSAGES = 60;
const TOAST_MS = 3600;
const UNDO_TOAST_MS = 7000;

/** Signed-in workspaces live in the database, so nothing personal is left in the browser. */
const noStorage: StateStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

function reinsert<T>(list: T[], item: T, index: number) {
  const next = [...list];
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}

const seed = () => ({
  priorities: SEED_PRIORITIES,
  actions: SEED_ACTIONS,
  history: SEED_HISTORY,
  memories: SEED_MEMORIES,
  ideas: SEED_IDEAS,
  goals: SEED_GOALS,
  events: SEED_EVENTS,
  habits: SEED_HABITS,
  workflows: SEED_WORKFLOWS,
  notices: SEED_NOTICES,
  chat: SEED_CHAT,
  runs: [] as AgentRun[],
  apps: { gmail: true, calendar: true, slack: true, notion: true, github: false, drive: true, linear: false, stripe: false } as Record<AppId, boolean>,
  permissions: SEED_PERMISSIONS,
  profile: { name: "Brandon", role: "Pro", companionTone: "Warm" } as Profile,
  prefs: { ambient: true, motion: true, emailDigest: true, pushAlerts: true, weeklyReview: true } as Prefs,
  privacy: { memoryAccess: "Only you", dataSharing: false, autoDelete: 90 } as Privacy,
  privateMode: true,
  safeMode: true,
  online: true,
  tourDone: false,
  sample: true,
  /** So summary emails arrive at the user's own 7 AM. Updated from the browser on each visit. */
  timezone: "UTC",
});

/** Where a real account starts: the same settings, with none of the sample content. */
export const emptyWorkspace = () => ({
  ...seed(),
  priorities: [],
  actions: [],
  history: [],
  memories: [],
  ideas: [],
  goals: [],
  events: [],
  habits: [],
  workflows: [],
  notices: [],
  profile: { ...seed().profile, role: "Early access" },
  apps: Object.fromEntries(Object.keys(seed().apps).map((id) => [id, false])) as Record<AppId, boolean>,
  sample: false,
});

export interface Store extends ReturnType<typeof seed> {
  /* Transient UI, never persisted */
  account: Account | null;
  /** Dated activity loaded from the server, plus what this session has added. */
  timeline: History;
  /** Activity changes waiting to be sent with the next save. */
  outbox: { add: ActivityEntry[]; remove: string[] };
  /** Live from Google when connected. Never saved with the workspace. */
  google: GoogleState | null;
  toasts: Toast[];
  launch: { open: boolean; agent?: AgentId; task?: string };
  reviewing: string | null;
  briefOpen: boolean;
  paletteOpen: boolean;
  captureOpen: boolean;
  chatExpanded: boolean;
  chatStatus: "idle" | "thinking" | "streaming";
  chatMode: "live" | "demo" | null;
  selectedGoal: string;

  toast: (text: string, tone?: Toast["tone"], action?: Toast["action"]) => void;
  dismissToast: (id: string) => void;
  setUi: (patch: Partial<Pick<Store, "launch" | "reviewing" | "briefOpen" | "paletteOpen" | "captureOpen" | "chatExpanded" | "chatStatus" | "chatMode" | "selectedGoal">>) => void;

  togglePriority: (id: string) => void;
  addPriority: (title: string, repeat?: Repeat) => void;
  setRepeat: (id: string, repeat: Repeat | undefined) => void;
  removePriority: (id: string) => void;

  resolveAction: (id: string, outcome: Outcome) => void;
  snoozeAction: (id: string) => void;

  addMemory: (m: { title: string; detail?: string; type?: MemoryType; area?: MemoryArea; fileId?: string }) => void;
  removeMemory: (id: string) => void;
  togglePin: (id: string) => void;
  eraseMemories: () => void;

  addIdea: (title: string, tag: string) => void;
  toggleIdea: (id: string) => void;
  promoteIdea: (id: string) => string | undefined;

  addGoal: (title: string, area: string, due: string) => string;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  scheduleNext: (goalId: string) => void;

  addEvent: (e: Omit<CalEvent, "id">) => void;
  moveEvent: (id: string, patch: Pick<CalEvent, "day" | "start" | "duration">) => void;
  setReminder: (id: string, minutes: number | undefined) => void;
  removeEvent: (id: string) => void;
  toggleHabit: (id: string, day: number) => void;
  addHabit: (title: string) => void;

  launchAgent: (agent: AgentId, task: string) => void;
  settleRuns: () => void;

  toggleApp: (id: AppId) => void;
  toggleWorkflow: (id: string) => void;
  runWorkflow: (id: string) => void;
  addWorkflow: (w: Pick<Workflow, "name" | "trigger" | "steps">) => void;

  markNoticesRead: () => void;
  pushChat: (m: ChatMessage) => void;
  appendChat: (id: string, delta: string) => void;
  patchChat: (id: string, patch: Partial<ChatMessage>) => void;
  removeChat: (ids: string[]) => void;
  clearChat: () => void;

  togglePermission: (agent: AgentId, p: Permission) => void;
  setProfile: (p: Partial<Profile>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setPrivacy: (p: Partial<Privacy>) => void;
  setPill: (key: "privateMode" | "safeMode" | "online", value: boolean) => void;
  setTourDone: (done: boolean) => void;
  /** Clears last week's routine check-ins when a new week has started. */
  startWeek: () => void;
  /** Reopens repeating tasks that are due again and moves unfinished tasks from earlier days to today. */
  startDay: () => void;
  notify: (notice: Pick<Notice, "title" | "detail" | "href">) => void;
  loadSample: () => void;
  clearWorkspace: () => void;
}

/** Turns a goal title into a concrete milestone plan. A model call replaces this later. */
export function draftPlan(title: string) {
  const short = title.replace(/\.$/, "");
  return [
    `Define what "${short}" looks like when done`,
    "Measure where you are today",
    "Break the work into weekly milestones",
    "Block recurring time in Life Planner",
    "Review progress with Goal Intelligence",
    `Finish: ${short}`,
  ];
}

const makeGoal = (title: string, area: string, due: string): Goal => ({
  id: uid(),
  title,
  area,
  due,
  status: isStaticDemo ? "Plan ready" : "Drafting a plan...",
  insight: "A starting plan. Edit the steps to fit, or turn on AI for a plan built from your schedule.",
  milestones: draftPlan(title).map((t) => ({ id: uid(), title: t, done: false })),
});

/** Replaces the starting plan with one written by AI, when it's on. The template stays if it isn't. */
async function refinePlan(goal: Goal) {
  const set = useStore.setState;
  const update = (patch: Partial<Goal>) => set((s) => ({ goals: s.goals.map((g) => (g.id === goal.id ? { ...g, ...patch } : g)) }));
  const [{ planGoal, toMilestones }, { buildContext }] = await Promise.all([import("./agent-work"), import("./chat-context")]);
  try {
    const plan = await planGoal(goal, buildContext(useStore.getState()));
    if (!plan) return update({ status: "Plan ready" });
    // Only if the user hasn't started on the starting plan in the meantime.
    const current = useStore.getState().goals.find((g) => g.id === goal.id);
    if (!current || current.milestones.some((m) => m.done)) return update({ status: "Plan ready" });
    update({ milestones: toMilestones(plan.milestones, uid), insight: plan.insight, status: "Plan ready" });
  } catch {
    update({ status: "Plan ready" });
  }
}

/** The part of the store that belongs to the user, leaving out transient UI. */
export function savedState(s: Store) {
  const { account, timeline, outbox, google, toasts, launch, reviewing, briefOpen, paletteOpen, captureOpen, chatExpanded, chatStatus, chatMode, selectedGoal, ...rest } = s;
  void account, timeline, outbox, google, toasts, launch, reviewing, briefOpen, paletteOpen, captureOpen, chatExpanded, chatStatus, chatMode, selectedGoal;
  return rest;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** Swaps the content but keeps who the user is, their time zone and whether they've seen the tour. */
      const replaceWorkspace = (next: ReturnType<typeof seed>) => {
        const { account, tourDone, timezone } = get();
        set({ ...next, tourDone, timezone, selectedGoal: next.goals[0]?.id ?? "" });
        if (account) get().setProfile({ name: account.name });
      };

      /** Records activity for a signed-in account. The demo has no server to keep it. */
      const log = (kind: ActivityKind, key: string, title: string, at = Date.now()) => {
        if (!get().account) return;
        const entry: ActivityEntry = { key, kind, title, at };
        set((s) => ({
          timeline: { ...s.timeline, entries: [...s.timeline.entries.filter((e) => e.key !== key), entry] },
          outbox: { add: [...s.outbox.add.filter((e) => e.key !== key), entry], remove: s.outbox.remove.filter((k) => k !== key) },
        }));
      };
      const unlog = (key: string) => {
        if (!get().account) return;
        set((s) => ({
          timeline: { ...s.timeline, entries: s.timeline.entries.filter((e) => e.key !== key) },
          outbox: { add: s.outbox.add.filter((e) => e.key !== key), remove: [...s.outbox.remove.filter((k) => k !== key), key] },
        }));
      };

      return {
        ...seed(),

        account: null,
        timeline: emptyHistory(),
        outbox: { add: [], remove: [] },
        google: null,
        toasts: [],
        launch: { open: false },
        reviewing: null,
        briefOpen: false,
        paletteOpen: false,
        captureOpen: false,
        chatExpanded: false,
        chatStatus: "idle",
        chatMode: null,
        selectedGoal: "g1",

        toast: (text, tone = "good", action) => {
          const id = uid();
          set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone, action }] }));
          setTimeout(() => get().dismissToast(id), action ? UNDO_TOAST_MS : TOAST_MS);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        setUi: (patch) => set(patch),

        togglePriority: (id) => {
          const item = get().priorities.find((p) => p.id === id);
          if (!item) return;
          const today = dayKey(Date.now());
          set((s) => ({ priorities: s.priorities.map((p) => (p.id === id ? { ...p, done: !p.done, doneOn: p.done ? undefined : today } : p)) }));
          // Keyed by day, so a repeating task counts once each time it's done.
          if (item.done) unlog(`task:${id}:${item.doneOn ?? today}`);
          else log("task", `task:${id}:${today}`, item.title);
        },
        addPriority: (title, repeat) =>
          set((s) => ({ priorities: [...s.priorities, { id: uid(), title, done: false, repeat, due: dayKey(Date.now()) } satisfies Priority] })),
        setRepeat: (id, repeat) => set((s) => ({ priorities: s.priorities.map((p) => (p.id === id ? { ...p, repeat } : p)) })),
        removePriority: (id) => {
          const index = get().priorities.findIndex((p) => p.id === id);
          if (index < 0) return;
          const item = get().priorities[index];
          set((s) => ({ priorities: s.priorities.filter((p) => p.id !== id) }));
          get().toast("Task removed", "info", { label: "Undo", run: () => set((s) => ({ priorities: reinsert(s.priorities, item, index) })) });
        },

        resolveAction: (id, outcome) => {
          const item = get().actions.find((a) => a.id === id);
          if (!item) return;
          const record: ActionRecord = { id: uid(), title: item.title, outcome, agent: item.agent, at: Date.now() };
          set((s) => ({
            actions: s.actions.filter((a) => a.id !== id),
            history: [record, ...s.history],
            reviewing: null,
          }));
          log(outcome, `action:${record.id}`, item.title);
          get().toast(outcome === "approved" ? `Approved: ${item.title}` : `Declined: ${item.title}`, outcome === "approved" ? "good" : "info");
        },
        snoozeAction: (id) => {
          set((s) => {
            const item = s.actions.find((a) => a.id === id);
            if (!item) return s;
            return { actions: [...s.actions.filter((a) => a.id !== id), item], reviewing: null };
          });
          get().toast("Snoozed. Moved to the end of your queue.", "info");
        },

        addMemory: ({ title, detail = "", type = "note", area = "Work", fileId }) => {
          const m: Memory = { id: uid(), title, detail, type, area, daysAgo: 0, at: Date.now(), fileId };
          set((s) => ({ memories: [m, ...s.memories] }));
        },
        removeMemory: (id) => {
          const index = get().memories.findIndex((m) => m.id === id);
          if (index < 0) return;
          const item = get().memories[index];
          set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }));
          get().toast("Memory deleted", "info", { label: "Undo", run: () => set((s) => ({ memories: reinsert(s.memories, item, index) })) });
        },
        togglePin: (id) =>
          set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),
        eraseMemories: () => {
          const erased = get().memories;
          set({ memories: [] });
          get().toast("All memories erased", "info", { label: "Undo", run: () => set({ memories: erased }) });
        },

        addIdea: (title, tag) =>
          set((s) => ({ ideas: [{ id: uid(), title, tag, starred: false } satisfies Idea, ...s.ideas] })),
        toggleIdea: (id) =>
          set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, starred: !i.starred } : i)) })),
        promoteIdea: (id) => {
          const idea = get().ideas.find((i) => i.id === id);
          if (!idea) return;
          const goal = makeGoal(idea.title, idea.tag, "3 months");
          set((s) => ({
            ideas: s.ideas.filter((i) => i.id !== id),
            goals: [goal, ...s.goals],
            selectedGoal: goal.id,
          }));
          if (!isStaticDemo) void refinePlan(goal);
          return goal.id;
        },

        addGoal: (title, area, due) => {
          const goal = makeGoal(title, area, due);
          set((s) => ({ goals: [goal, ...s.goals], selectedGoal: goal.id }));
          if (!isStaticDemo) void refinePlan(goal);
          return goal.id;
        },
        toggleMilestone: (goalId, milestoneId) => {
          const item = get().goals.find((g) => g.id === goalId)?.milestones.find((m) => m.id === milestoneId);
          if (!item) return;
          set((s) => ({
            goals: s.goals.map((g) =>
              g.id === goalId
                ? { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }
                : g,
            ),
          }));
          const key = `milestone:${goalId}:${milestoneId}`;
          if (item.done) unlog(key);
          else log("milestone", key, item.title);
        },
        scheduleNext: (goalId) => {
          const goal = get().goals.find((g) => g.id === goalId);
          const next = goal?.milestones.find((m) => !m.done);
          if (!goal || !next) return;
          if (get().priorities.some((p) => p.title === next.title)) {
            get().toast("That step is already in today's priorities.", "info");
            return;
          }
          get().addPriority(next.title);
          get().toast("Added to today's priorities");
        },

        addEvent: (e) => set((s) => ({ events: [...s.events, { ...e, id: uid() }] })),
        moveEvent: (id, patch) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
        setReminder: (id, minutes) => set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, remind: minutes } : e)) })),
        removeEvent: (id) => {
          const item = get().events.find((e) => e.id === id);
          if (!item) return;
          set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
          get().toast("Event removed", "info", { label: "Undo", run: () => set((s) => ({ events: [...s.events, item] })) });
        },
        toggleHabit: (id, day) => {
          const item = get().habits.find((h) => h.id === id);
          if (!item) return;
          const on = !item.week[day];
          set((s) => ({
            habits: s.habits.map((h: Habit) => {
              if (h.id !== id) return h;
              const week = h.week.map((v, i) => (i === day ? on : v));
              return { ...h, week, weekOf: h.weekOf && weekKey(Date.now()), streak: Math.max(0, h.streak + (on ? 1 : -1)) };
            }),
          }));
          const at = dateOfWeekday(day);
          const key = `checkin:${id}:${dayKey(at)}`;
          if (on) log("checkin", key, item.title, at);
          else unlog(key);
        },

        addHabit: (title) =>
          set((s) => ({ habits: [...s.habits, { id: uid(), title, week: Array(7).fill(false), streak: 0, weekOf: weekKey(Date.now()) } satisfies Habit] })),

        launchAgent: (agent, task) => {
          const id = uid();
          const def = agentById(agent);
          set((s) => ({
            runs: [{ id, agent, task, step: 0, status: "running" as const, at: Date.now() }, ...s.runs].slice(0, 12),
            launch: { open: false },
          }));
          get().toast(`${def.name} is on it`, "info");

          // The model works while the steps play. Without AI, the agent hands back a labelled preview.
          const work = isStaticDemo
            ? Promise.resolve(null)
            : Promise.all([import("./agent-work"), import("./chat-context")])
                .then(([{ runAgent }, { buildContext }]) => runAgent(agent, task, buildContext(get())))
                // Held as a value until the steps finish, so an early failure isn't reported as unhandled.
                .catch((error: unknown) => (error instanceof Error ? error : new Error("The agent stopped unexpectedly.")));

          const tick = (step: number) => {
            if (!get().runs.some((r) => r.id === id)) return;
            if (step < RUN_STEPS.length) {
              set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, step } : r)) }));
              setTimeout(() => tick(step + 1), 1500);
              return;
            }
            void work.then((outcome) => {
              if (!(outcome instanceof Error)) return finish(outcome);
              set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, status: "done" as const, step: RUN_STEPS.length } : r)) }));
              get().notify({ title: `${def.name} couldn't finish`, detail: outcome.message, href: "/agents" });
            });
          };

          const finish = (result: AgentResult | null) => {
            const safe = get().safeMode;
            const notice: Notice = {
              id: uid(),
              title: `${def.name} finished`,
              detail: safe ? "Result is waiting in Action Center." : task,
              at: Date.now(),
              read: false,
              href: safe ? "/actions" : "/agents",
            };
            const short = task.length > 34 ? `${task.slice(0, 32).trimEnd()}...` : task;
            const action: ActionItem = result
              ? { id: uid(), title: short, icon: "draft", priority: result.priority, agent, summary: result.summary, impact: result.impact, result: result.output }
              : {
                  id: uid(),
                  title: short,
                  icon: "file",
                  priority: "Medium",
                  agent,
                  summary: `A preview of how ${def.name} would handle "${task}". Turn on AI to have agents do the work for real.`,
                  impact: "Prepared by your agent team",
                };
            set((s) => ({
              runs: s.runs.map((r) => (r.id === id ? { ...r, status: "done" as const, step: RUN_STEPS.length } : r)),
              notices: [notice, ...s.notices],
              actions: safe ? [action, ...s.actions] : s.actions,
              history: safe
                ? s.history
                : [{ id: uid(), title: task, outcome: "approved" as const, agent, at: Date.now() }, ...s.history],
            }));
            log("agent", `agent:${id}`, `${def.name}: ${task}`);
            // The result shows here already. Push tells the user's phone and other devices.
            if (get().account) void import("./push-client").then((p) => p.notifyOtherDevices({ title: notice.title, body: notice.detail, url: notice.href ?? "/" }));
            get().addMemory({ title: `${def.name}: ${task}`, detail: result ? result.output.slice(0, 300) : "Saved from an agent run.", type: "note", area: "Work" });
            get().toast(safe ? `${def.name} sent a result for review` : `${def.name} finished: ${task}`);
          };
          setTimeout(() => tick(1), 1500);
        },
        settleRuns: () =>
          set((s) => ({
            runs: s.runs.map((r) => (r.status === "running" ? { ...r, status: "done" as const, step: RUN_STEPS.length } : r)),
          })),

        toggleApp: (id) => set((s) => ({ apps: { ...s.apps, [id]: !s.apps[id] } })),
        toggleWorkflow: (id) =>
          set((s) => ({ workflows: s.workflows.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)) })),
        runWorkflow: (id) => {
          const item = get().workflows.find((w) => w.id === id);
          if (!item) return;
          set((s) => ({
            workflows: s.workflows.map((w) => (w.id === id ? { ...w, runs: w.runs + 1, lastRun: Date.now() } : w)),
          }));
          log("workflow", `workflow:${id}:${uid()}`, item.name);
        },
        addWorkflow: (w) =>
          set((s) => ({ workflows: [{ ...w, id: uid(), enabled: true, runs: 0, lastRun: "Never" }, ...s.workflows] })),

        markNoticesRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
        pushChat: (m) => set((s) => ({ chat: [...s.chat, m].slice(-MAX_SAVED_MESSAGES) })),
        appendChat: (id, delta) => set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, text: m.text + delta } : m)) })),
        patchChat: (id, patch) => set((s) => ({ chat: s.chat.map((m) => (m.id === id ? { ...m, ...patch } : m)) })),
        removeChat: (ids) => set((s) => ({ chat: s.chat.filter((m) => !ids.includes(m.id)) })),
        clearChat: () => set({ chat: [] }),

        togglePermission: (agent, p) =>
          set((s) => {
            const has = s.permissions[agent].includes(p);
            return {
              permissions: {
                ...s.permissions,
                [agent]: has ? s.permissions[agent].filter((x) => x !== p) : [...s.permissions[agent], p],
              },
            };
          }),
        setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
        setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
        setPrivacy: (p) => set((s) => ({ privacy: { ...s.privacy, ...p } })),
        setPill: (key, value) => set({ [key]: value } as Pick<Store, typeof key>),
        setTourDone: (done) => set({ tourDone: done }),
        startDay: () => {
          const now = Date.now();
          const today = dayKey(now);
          const weekday = (new Date(now).getDay() + 6) % 7;
          const reopens = (p: Priority) => {
            if (!p.done || !p.repeat || !p.doneOn || p.doneOn === today) return false;
            if (p.repeat === "weekly") return weekKey(new Date(`${p.doneOn}T12:00`)) !== weekKey(now);
            return p.repeat === "daily" || weekday < 5;
          };
          const overdue = (p: Priority) => !p.done && !!p.due && p.due < today;
          const moved = get().priorities.filter(overdue).length;
          if (!moved && !get().priorities.some(reopens)) return;

          set((s) => ({
            priorities: s.priorities.map((p) =>
              reopens(p) ? { ...p, done: false, doneOn: undefined, due: today } : overdue(p) ? { ...p, due: today } : p,
            ),
          }));
          if (moved) {
            const text = `${moved} unfinished ${moved === 1 ? "task" : "tasks"} moved to today`;
            get().notify({ title: text, detail: "Carried over from an earlier day.", href: "/planner#today" });
          }
        },
        notify: (notice) => {
          set((s) => ({ notices: [{ ...notice, id: uid(), at: Date.now(), read: false }, ...s.notices].slice(0, 50) }));
          get().toast(notice.title, "info");
        },
        startWeek: () => {
          const current = weekKey(Date.now());
          if (!get().habits.some((h) => h.weekOf && h.weekOf !== current)) return;
          set((s) => ({ habits: s.habits.map((h) => (h.weekOf && h.weekOf !== current ? { ...h, week: Array(7).fill(false), weekOf: current } : h)) }));
        },
        loadSample: () => replaceWorkspace(seed()),
        clearWorkspace: () => replaceWorkspace(emptyWorkspace()),
      };
    },
    {
      name: "nexus-os-v1",
      skipHydration: true,
      storage: createJSONStorage(() => (isStaticDemo ? localStorage : noStorage)),
      partialize: savedState,
    },
  ),
);
