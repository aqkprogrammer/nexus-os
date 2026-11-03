import type { AgentId, Milestone } from "./data";
import { AI_LIMIT_MESSAGE } from "./utils";

/** What an agent hands back for review. */
export interface AgentResult {
  title: string;
  summary: string;
  /** The work itself: a draft, a plan or a list, ready to use. */
  output: string;
  impact: string;
  priority: "High" | "Medium" | "Low";
}

export interface GoalPlan {
  milestones: string[];
  insight: string;
}

/** Null when no model is configured, so the caller can fall back. Throws when the model fails. */
async function post<T>(url: string, body: unknown): Promise<T | null> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 503 || res.status === 404) return null;
  if (res.status === 402) throw new Error(AI_LIMIT_MESSAGE);
  if (!res.ok) throw new Error(res.status === 429 ? "Too many requests. Try again in a minute." : "The AI service didn't respond.");
  return (await res.json()) as T;
}

export async function runAgent(agent: AgentId, task: string, context: unknown) {
  return (await post<{ result: AgentResult }>("/api/agents/run", { agent, task, context }))?.result ?? null;
}

export async function planGoal(goal: { title: string; area: string; due: string }, context: unknown) {
  return (await post<{ plan: GoalPlan }>("/api/plan", { ...goal, context }))?.plan ?? null;
}

export const toMilestones = (titles: string[], id: () => string): Milestone[] => titles.map((title) => ({ id: id(), title, done: false }));
