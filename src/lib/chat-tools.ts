import type { FunctionTool } from "openai/resources/responses/responses";
import { AGENTS, AREAS, MEMORY_AREAS, MEMORY_ICONS, type AgentId, type LifeArea, type MemoryArea, type MemoryType } from "./data";

const GOAL_AREAS = ["Work", "Health", "Money", "Learning", "Family"];
const TIMEFRAMES = ["1 month", "3 months", "6 months", "1 year"];
const MEMORY_TYPES = Object.keys(MEMORY_ICONS);
const AGENT_IDS = AGENTS.map((a) => a.id as string);

const tool = (name: string, description: string, properties: Record<string, unknown>): FunctionTool => ({
  type: "function",
  name,
  description,
  strict: true,
  parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
});

/** Everything the companion can change. All of it stays inside the user's own workspace. */
export const CHAT_TOOLS: FunctionTool[] = [
  tool("add_task", "Add a task to today's priorities.", {
    title: { type: "string", description: "Short task title" },
  }),
  tool("save_memory", "Save a fact, promise or idea to the user's AI Brain.", {
    title: { type: "string", description: "What to remember, in one short line" },
    detail: { type: "string", description: "Optional extra context, or an empty string" },
    area: { type: "string", enum: MEMORY_AREAS },
    type: { type: "string", enum: MEMORY_TYPES },
  }),
  tool("add_event", "Add an event to this week's calendar.", {
    title: { type: "string" },
    day: { type: "integer", description: "Day of this week. Monday is 0 and Sunday is 6." },
    start: { type: "number", description: "Start hour in 24-hour time, from 7 to 20.5. 13.5 means 1:30 PM." },
    duration: { type: "number", description: "Length in hours, from 0.5 to 4" },
    area: { type: "string", enum: AREAS },
  }),
  tool("create_goal", "Create a long-term goal. Nexus drafts its milestone plan automatically.", {
    title: { type: "string", description: "The outcome the user wants" },
    area: { type: "string", enum: GOAL_AREAS },
    timeframe: { type: "string", enum: TIMEFRAMES },
  }),
  tool("launch_agent", "Hand a task to one of the ten specialist agents.", {
    agent: { type: "string", enum: AGENT_IDS },
    task: { type: "string", description: "What the agent should do, in one short line" },
  }),
];

export type ChatToolCall =
  | { name: "add_task"; args: { title: string } }
  | { name: "save_memory"; args: { title: string; detail: string; area: MemoryArea; type: MemoryType } }
  | { name: "add_event"; args: { title: string; day: number; start: number; duration: number; area: LifeArea } }
  | { name: "create_goal"; args: { title: string; area: string; timeframe: string } }
  | { name: "launch_agent"; args: { agent: AgentId; task: string } };

const text = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const oneOf = (v: unknown, options: readonly string[]) => (typeof v === "string" && options.includes(v) ? v : null);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Checks model output before anything touches app state. Returns null when it isn't usable. */
export function parseToolCall(name: string, raw: unknown): ChatToolCall | null {
  let a: Record<string, unknown>;
  try {
    a = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
  } catch {
    return null;
  }
  if (!a || typeof a !== "object") return null;

  switch (name) {
    case "add_task": {
      const title = text(a.title);
      return title ? { name, args: { title } } : null;
    }
    case "save_memory": {
      const title = text(a.title);
      const area = oneOf(a.area, MEMORY_AREAS) as MemoryArea | null;
      const type = oneOf(a.type, MEMORY_TYPES) as MemoryType | null;
      return title && area && type ? { name, args: { title, detail: text(a.detail, 400) ?? "", area, type } } : null;
    }
    case "add_event": {
      const title = text(a.title);
      const area = oneOf(a.area, AREAS) as LifeArea | null;
      const { day, start, duration } = a;
      if (!title || !area || !Number.isInteger(day) || typeof start !== "number" || typeof duration !== "number") return null;
      return {
        name,
        args: {
          title,
          area,
          day: clamp(day as number, 0, 6),
          start: clamp(Math.round(start * 2) / 2, 7, 20.5),
          duration: clamp(Math.round(duration * 2) / 2, 0.5, 4),
        },
      };
    }
    case "create_goal": {
      const title = text(a.title);
      const area = oneOf(a.area, GOAL_AREAS);
      const timeframe = oneOf(a.timeframe, TIMEFRAMES);
      return title && area && timeframe ? { name, args: { title, area, timeframe } } : null;
    }
    case "launch_agent": {
      const task = text(a.task);
      const agent = oneOf(a.agent, AGENT_IDS) as AgentId | null;
      return task && agent ? { name, args: { agent, task } } : null;
    }
    default:
      return null;
  }
}

export type ChatEvent = { type: "text"; delta: string } | { type: "tool"; call: ChatToolCall } | { type: "error"; message: string };
