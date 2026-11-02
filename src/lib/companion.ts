import { goalProgress } from "./data";
import { liveStats } from "./stats";
import type { ChatMessage, Store } from "./store";

type Reply = Pick<ChatMessage, "text" | "link">;

const list = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

const clock = (h: number) => {
  const hour = Math.floor(h);
  const mins = Math.round((h - hour) * 60);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}${mins ? `:${String(mins).padStart(2, "0")}` : ""} ${suffix}`;
};

/**
 * The companion's brain. It answers from live app state and can change it, so
 * this one function is the seam to replace with a call to the model backend.
 */
export function companionReply(input: string, s: Store, today: number): Reply {
  const q = input.trim().toLowerCase();

  const remember = input.match(/^(?:please\s+)?remember(?:\s+that)?\s+(.+)/i);
  if (remember) {
    s.addMemory({ title: remember[1], detail: "Saved from chat.", type: "note" });
    return { text: `Saved to your AI Brain: "${remember[1]}".`, link: { label: "Open AI Brain", href: "/brain" } };
  }

  const task = input.match(/^(?:add|create)\s+(?:a\s+)?(?:task|priority)[:\s]+(.+)/i);
  if (task) {
    s.addPriority(task[1]);
    return { text: `Added "${task[1]}" to today's priorities.`, link: { label: "Open planner", href: "/planner#today" } };
  }

  if (/agenda|schedule|calendar|today/.test(q)) {
    const events = s.events.filter((e) => e.day === today).sort((a, b) => a.start - b.start);
    if (events.length === 0) return { text: "Nothing is booked today, so your whole day is open for focus work." };
    return {
      text: `Here's your day:\n${list(events.map((e) => `${clock(e.start)} - ${e.title}`))}`,
      link: { label: "Open planner", href: "/planner#week" },
    };
  }

  if (/priorit|focus|to.?do/.test(q)) {
    const open = s.priorities.filter((p) => !p.done);
    if (open.length === 0) return { text: "Every priority is done for today. Nice work!" };
    return {
      text: `You have ${open.length} open ${open.length === 1 ? "priority" : "priorities"}:\n${list(open.map((p) => p.title))}`,
      link: { label: "Open planner", href: "/planner#today" },
    };
  }

  if (/progress|update|analytic|stats|week/.test(q)) {
    const w = liveStats(s, "week");
    return {
      text: `This week you logged ${w.focus} focus hours, up ${w.focusDelta}% on ${w.compare}. You finished ${w.tasks} tasks, and automations saved you ${w.saved}.`,
      link: { label: "See Life Analytics", href: "/analytics" },
    };
  }

  if (/goal|needs me|behind/.test(q)) {
    const sorted = [...s.goals].sort((a, b) => goalProgress(a) - goalProgress(b));
    const g = sorted[0];
    if (!g) return { text: "You don't have any goals yet. Tell me one and I'll draft a plan.", link: { label: "Add a goal", href: "/goals" } };
    return {
      text: `"${g.title}" needs you most. It's at ${goalProgress(g)}%. ${g.insight}`,
      link: { label: "Open Goal Intelligence", href: "/goals" },
    };
  }

  if (/action|approv|review/.test(q)) {
    const n = s.actions.length;
    if (n === 0) return { text: "Your Action Center is clear. Nothing is waiting on you." };
    return {
      text: `${n} ${n === 1 ? "action is" : "actions are"} waiting for you. Top of the list: ${s.actions[0].title}.`,
      link: { label: "Open Action Center", href: "/actions" },
    };
  }

  if (/agent|launch/.test(q)) {
    const running = s.runs.filter((r) => r.status === "running").length;
    return {
      text: running ? `${running} of your agents ${running === 1 ? "is" : "are"} working right now.` : "All 10 agents are ready. Tell me what you need and I'll hand it off.",
      link: { label: "Open AI Agents", href: "/agents" },
    };
  }

  if (/automat|workflow/.test(q)) {
    const on = s.workflows.filter((w) => w.enabled).length;
    return { text: `${on} of ${s.workflows.length} workflows are active.`, link: { label: "Open Automation Hub", href: "/automations" } };
  }

  if (/^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/.test(q)) {
    return { text: `Hi ${s.profile.name}! What should we tackle first?` };
  }

  return {
    text: 'I can check your agenda, priorities, progress, goals and actions. I can also save things: try "remember Sam prefers calls" or "add task book flights".',
  };
}
