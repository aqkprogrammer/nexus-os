"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  type Workflow,
} from "./data";
import { uid } from "./utils";

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
}

interface Profile {
  name: string;
  role: string;
  companionTone: "Warm" | "Direct" | "Playful";
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
});

export interface Store extends ReturnType<typeof seed> {
  /* Transient UI, never persisted */
  toasts: Toast[];
  launch: { open: boolean; agent?: AgentId; task?: string };
  reviewing: string | null;
  briefOpen: boolean;
  paletteOpen: boolean;
  chatExpanded: boolean;
  chatStatus: "idle" | "thinking" | "streaming";
  chatMode: "live" | "demo" | null;
  selectedGoal: string;

  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setUi: (patch: Partial<Pick<Store, "launch" | "reviewing" | "briefOpen" | "paletteOpen" | "chatExpanded" | "chatStatus" | "chatMode" | "selectedGoal">>) => void;

  togglePriority: (id: string) => void;
  addPriority: (title: string) => void;
  removePriority: (id: string) => void;

  resolveAction: (id: string, outcome: Outcome) => void;
  snoozeAction: (id: string) => void;

  addMemory: (m: { title: string; detail?: string; type?: MemoryType; area?: MemoryArea }) => void;
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
  removeEvent: (id: string) => void;
  toggleHabit: (id: string, day: number) => void;

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
  resetDemo: () => void;
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
  status: "Plan ready",
  insight: "I drafted this plan from your schedule and past goals. Start with the first milestone this week.",
  milestones: draftPlan(title).map((t) => ({ id: uid(), title: t, done: false })),
});

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seed(),

      toasts: [],
      launch: { open: false },
      reviewing: null,
      briefOpen: false,
      paletteOpen: false,
      chatExpanded: false,
      chatStatus: "idle",
      chatMode: null,
      selectedGoal: "g1",

      toast: (text, tone = "good") => {
        const id = uid();
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
        setTimeout(() => get().dismissToast(id), 3600);
      },
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      setUi: (patch) => set(patch),

      togglePriority: (id) =>
        set((s) => ({ priorities: s.priorities.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) })),
      addPriority: (title) =>
        set((s) => ({ priorities: [...s.priorities, { id: uid(), title, done: false } satisfies Priority] })),
      removePriority: (id) => set((s) => ({ priorities: s.priorities.filter((p) => p.id !== id) })),

      resolveAction: (id, outcome) => {
        const item = get().actions.find((a) => a.id === id);
        if (!item) return;
        const record: ActionRecord = { id: uid(), title: item.title, outcome, agent: item.agent, at: Date.now() };
        set((s) => ({
          actions: s.actions.filter((a) => a.id !== id),
          history: [record, ...s.history],
          reviewing: null,
        }));
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

      addMemory: ({ title, detail = "", type = "note", area = "Work" }) => {
        const m: Memory = {
          id: uid(),
          title,
          detail,
          type,
          area,
          daysAgo: 0,
          time: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        };
        set((s) => ({ memories: [m, ...s.memories] }));
      },
      removeMemory: (id) => set((s) => ({ memories: s.memories.filter((m) => m.id !== id) })),
      togglePin: (id) =>
        set((s) => ({ memories: s.memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m)) })),
      eraseMemories: () => set({ memories: [] }),

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
        return goal.id;
      },

      addGoal: (title, area, due) => {
        const goal = makeGoal(title, area, due);
        set((s) => ({ goals: [goal, ...s.goals], selectedGoal: goal.id }));
        return goal.id;
      },
      toggleMilestone: (goalId, milestoneId) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }
              : g,
          ),
        })),
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
      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
      toggleHabit: (id, day) =>
        set((s) => ({
          habits: s.habits.map((h: Habit) => {
            if (h.id !== id) return h;
            const week = h.week.map((v, i) => (i === day ? !v : v));
            return { ...h, week, streak: Math.max(0, h.streak + (week[day] ? 1 : -1)) };
          }),
        })),

      launchAgent: (agent, task) => {
        const id = uid();
        const def = agentById(agent);
        set((s) => ({
          runs: [{ id, agent, task, step: 0, status: "running" as const, at: Date.now() }, ...s.runs].slice(0, 12),
          launch: { open: false },
        }));
        get().toast(`${def.name} is on it`, "info");

        const tick = (step: number) => {
          if (!get().runs.some((r) => r.id === id)) return;
          if (step < RUN_STEPS.length) {
            set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, step } : r)) }));
            setTimeout(() => tick(step + 1), 1500);
            return;
          }
          const safe = get().safeMode;
          const notice: Notice = {
            id: uid(),
            title: `${def.name} finished`,
            detail: safe ? "Result is waiting in Action Center." : task,
            at: Date.now(),
            read: false,
            href: safe ? "/actions" : "/agents",
          };
          const action: ActionItem = {
            id: uid(),
            title: task.length > 34 ? `${task.slice(0, 32).trimEnd()}...` : task,
            icon: "file",
            priority: "Medium",
            agent,
            summary: `${def.name} completed "${task}" using your AI Brain context. Approve to apply the result.`,
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
          get().addMemory({ title: `${def.name}: ${task}`, detail: "Saved from an agent run.", type: "note", area: "Work" });
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
      runWorkflow: (id) =>
        set((s) => ({
          workflows: s.workflows.map((w) => (w.id === id ? { ...w, runs: w.runs + 1, lastRun: Date.now() } : w)),
        })),
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
      resetDemo: () => set(seed()),
    }),
    {
      name: "nexus-os-v1",
      skipHydration: true,
      partialize: (s) => {
        const { toasts, launch, reviewing, briefOpen, paletteOpen, chatExpanded, chatStatus, chatMode, selectedGoal, ...rest } = s;
        void toasts, launch, reviewing, briefOpen, paletteOpen, chatExpanded, chatStatus, chatMode, selectedGoal;
        return rest;
      },
    },
  ),
);
