import {
  BookOpen,
  Bot,
  Brain,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  ChartLine,
  CircleDollarSign,
  CreditCard,
  FileText,
  GitBranch,
  Hammer,
  Hash,
  HardDrive,
  Heart,
  HeartPulse,
  House,
  Lightbulb,
  ListChecks,
  ClipboardList,
  Mail,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  Target,
  Workflow,
  LayoutGrid,
  CircleCheckBig,
  ShieldHalf,
  type LucideIcon,
} from "lucide-react";

/* Navigation */

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: { label: string; href: string }[];
}

export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/brain", label: "AI Brain", icon: Brain },
  {
    href: "/agents",
    label: "AI Agents",
    icon: Bot,
    children: [
      { label: "Agent team", href: "/agents#team" },
      { label: "Live activity", href: "/agents#activity" },
    ],
  },
  {
    href: "/planner",
    label: "Life Planner",
    icon: CalendarCheck,
    children: [
      { label: "Today", href: "/planner#today" },
      { label: "This week", href: "/planner#week" },
      { label: "Routines", href: "/planner#routines" },
    ],
  },
  { href: "/analytics", label: "Life Analytics", icon: ChartLine },
  {
    href: "/automations",
    label: "Automation Hub",
    icon: Workflow,
    children: [
      { label: "Workflows", href: "/automations#workflows" },
      { label: "Connected apps", href: "/automations#apps" },
    ],
  },
  { href: "/goals", label: "Goal Intelligence", icon: Target },
  { href: "/actions", label: "Actions", icon: CircleCheckBig },
  { href: "/privacy", label: "Privacy", icon: ShieldHalf },
  { href: "/settings", label: "Settings", icon: Settings },
];

/* Agents */

export type AgentId =
  | "guardian"
  | "planner"
  | "researcher"
  | "money"
  | "creator"
  | "relationship"
  | "home"
  | "career"
  | "wellness"
  | "builder";

export interface AgentDef {
  id: AgentId;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  about: string;
  suggestions: string[];
}

export const AGENTS: AgentDef[] = [
  {
    id: "guardian",
    name: "Guardian",
    desc: "Protects & alerts",
    icon: ShieldCheck,
    color: "#fb9a3c",
    about: "Watches accounts, renewals and security signals, and flags anything unusual before it costs you.",
    suggestions: ["Check for expiring renewals", "Scan for unusual account activity"],
  },
  {
    id: "planner",
    name: "Planner",
    desc: "Plans & schedules",
    icon: CalendarDays,
    color: "#f472b6",
    about: "Turns priorities into a realistic schedule and protects your focus time.",
    suggestions: ["Plan my next week", "Find three deep-work blocks"],
  },
  {
    id: "researcher",
    name: "Researcher",
    desc: "Finds & analyzes",
    icon: Search,
    color: "#60a5fa",
    about: "Reads widely, compares options and brings back a sourced summary.",
    suggestions: ["Compare vector databases", "Summarize this week's AI news"],
  },
  {
    id: "money",
    name: "Money",
    desc: "Optimizes finances",
    icon: CircleDollarSign,
    color: "#34d399",
    about: "Tracks bills and subscriptions, and finds savings without touching your money.",
    suggestions: ["Find subscriptions I don't use", "Forecast next month's bills"],
  },
  {
    id: "creator",
    name: "Creator",
    desc: "Writes & designs",
    icon: PenLine,
    color: "#fbb024",
    about: "Drafts emails, posts and documents in your voice, ready for your review.",
    suggestions: ["Draft the weekly update", "Write a launch announcement"],
  },
  {
    id: "relationship",
    name: "Relationship",
    desc: "Strengthens bonds",
    icon: Heart,
    color: "#f4407f",
    about: "Remembers the people who matter and reminds you when to reach out.",
    suggestions: ["Who should I check in with?", "Plan something for Dad's birthday"],
  },
  {
    id: "home",
    name: "Home",
    desc: "Manages home",
    icon: House,
    color: "#60a5fa",
    about: "Keeps track of chores, repairs and everything your household runs on.",
    suggestions: ["Schedule the boiler service", "Build a weekly chore list"],
  },
  {
    id: "career",
    name: "Career",
    desc: "Grows your path",
    icon: Briefcase,
    color: "#fb9a3c",
    about: "Maps skills to opportunities and keeps your professional story up to date.",
    suggestions: ["Update my resume", "Prepare for my quarterly review"],
  },
  {
    id: "wellness",
    name: "Wellness",
    desc: "Mind & body",
    icon: HeartPulse,
    color: "#4ade80",
    about: "Balances training, sleep and recovery around the rest of your week.",
    suggestions: ["Plan this week's workouts", "Review my sleep patterns"],
  },
  {
    id: "builder",
    name: "Builder",
    desc: "Automates tasks",
    icon: Hammer,
    color: "#a78bfa",
    about: "Turns repetitive work into automations you can switch on in the Automation Hub.",
    suggestions: ["Automate my invoice filing", "Connect Slack to my weekly review"],
  },
];

export const agentById = (id: AgentId) => AGENTS.find((a) => a.id === id) as AgentDef;

export const RUN_STEPS = [
  "Reading context from AI Brain",
  "Planning the steps",
  "Executing with connected tools",
  "Preparing the result for you",
];

/* Priorities */

export interface Priority {
  id: string;
  title: string;
  done: boolean;
}

export const SEED_PRIORITIES: Priority[] = [
  { id: "p1", title: "Prepare Q2 Strategy Deck", done: true },
  { id: "p2", title: "Follow up with Laura", done: false },
  { id: "p3", title: "Workout & Wellness", done: false },
  { id: "p4", title: "Review agent engine spec", done: false },
];

/* Actions */

export type ActionIcon = "billing" | "mail" | "card" | "draft" | "calendar" | "file";

export interface ActionItem {
  id: string;
  title: string;
  icon: ActionIcon;
  value?: string;
  priority?: "High" | "Medium" | "Low";
  agent: AgentId;
  summary: string;
  impact: string;
}

export const ACTION_ICONS: Record<ActionIcon, LucideIcon> = {
  billing: CreditCard,
  mail: Mail,
  card: FileText,
  draft: PenLine,
  calendar: CalendarDays,
  file: ClipboardList,
};

export const SEED_ACTIONS: ActionItem[] = [
  {
    id: "a1",
    title: "Cancel Adobe Subscription",
    icon: "billing",
    value: "$52.99",
    agent: "money",
    summary: "You haven't opened any Adobe app in 74 days. The plan renews in 6 days.",
    impact: "Saves $635.88 a year",
  },
  {
    id: "a2",
    title: "Send follow-up to James",
    icon: "mail",
    priority: "High",
    agent: "relationship",
    summary: "James asked for the revised proposal on Tuesday. A reply is drafted and references your notes.",
    impact: "Keeps the partnership on schedule",
  },
  {
    id: "a3",
    title: "Review AMEX Bill",
    icon: "card",
    value: "$1,248.75",
    agent: "money",
    summary: "Your statement is due in 5 days. Two charges look higher than your usual pattern.",
    impact: "Avoids a late fee",
  },
  {
    id: "a4",
    title: "Approve drafted email",
    icon: "draft",
    priority: "Medium",
    agent: "creator",
    summary: "A thank-you note for the design team is ready, written in your usual tone.",
    impact: "Closes an open loop from last week",
  },
  {
    id: "a5",
    title: "Move dentist appointment",
    icon: "calendar",
    priority: "Low",
    agent: "planner",
    summary: "Thursday's appointment overlaps your investor call. Friday at 9:30 AM is free.",
    impact: "Resolves a calendar conflict",
  },
  {
    id: "a6",
    title: "Renew nexus domain",
    icon: "billing",
    value: "$48.00",
    agent: "guardian",
    summary: "The domain expires in 12 days and auto-renew is switched off.",
    impact: "Prevents a site outage",
  },
  {
    id: "a7",
    title: "Publish weekly review",
    icon: "file",
    priority: "Medium",
    agent: "creator",
    summary: "Your review is drafted from this week's memories, tasks and goal progress.",
    impact: "Keeps your 6-week streak",
  },
  {
    id: "a8",
    title: "Block Friday deep work",
    icon: "calendar",
    priority: "Low",
    agent: "planner",
    summary: "Friday morning is open. Protecting it adds 3 focus hours to your week.",
    impact: "Adds 3 focus hours",
  },
];

export type Outcome = "approved" | "declined";

export interface ActionRecord {
  id: string;
  title: string;
  outcome: Outcome;
  agent: AgentId;
  at: number | string;
}

export const SEED_HISTORY: ActionRecord[] = [
  { id: "h1", title: "Reordered household supplies", outcome: "approved", agent: "home", at: "Yesterday" },
  { id: "h2", title: "Declined gym upsell offer", outcome: "declined", agent: "money", at: "Yesterday" },
  { id: "h3", title: "Sent birthday reminder", outcome: "approved", agent: "relationship", at: "2d ago" },
];

/* Memory */

export type MemoryType = "idea" | "file" | "promise" | "note";
export type MemoryArea = "Work" | "Health" | "People" | "Money" | "Home" | "Ideas";

export interface Memory {
  id: string;
  title: string;
  detail: string;
  type: MemoryType;
  area: MemoryArea;
  /** Days before today, plus an optional clock time for today's entries */
  daysAgo: number;
  time?: string;
  pinned?: boolean;
}

export const MEMORY_ICONS: Record<MemoryType, { icon: LucideIcon; color: string; label: string }> = {
  idea: { icon: Lightbulb, color: "#fbb024", label: "Idea" },
  file: { icon: FileText, color: "#60a5fa", label: "File" },
  promise: { icon: Heart, color: "#f4407f", label: "Promise" },
  note: { icon: ClipboardList, color: "#fb9a3c", label: "Note" },
};

export const MEMORY_AREAS: MemoryArea[] = ["Work", "Health", "People", "Money", "Home", "Ideas"];

export const SEED_MEMORIES: Memory[] = [
  { id: "m1", title: "Saved idea: AI Wellness Coach", detail: "Daily check-ins that adapt training to sleep data.", type: "idea", area: "Ideas", daysAgo: 0, time: "8:15 AM" },
  { id: "m2", title: "Uploaded receipt - Costco", detail: "$184.20 on household supplies, filed under Home.", type: "file", area: "Money", daysAgo: 1 },
  { id: "m3", title: "Promise to call Mom", detail: "She wants to talk through the summer trip.", type: "promise", area: "People", daysAgo: 3, pinned: true },
  { id: "m4", title: "Project note - Q2 Planning", detail: "Prioritize activation over new acquisition channels.", type: "note", area: "Work", daysAgo: 4 },
  { id: "m5", title: "Knee feels better on softer routes", detail: "Stick to trails for long runs until the race.", type: "note", area: "Health", daysAgo: 5 },
  { id: "m6", title: "Prefers meetings after 10 AM", detail: "Mornings are protected for deep work.", type: "note", area: "Work", daysAgo: 6, pinned: true },
  { id: "m7", title: "Dad's birthday plan", detail: "He mentioned wanting the new walking boots.", type: "promise", area: "People", daysAgo: 7 },
  { id: "m8", title: "Boiler service is due in March", detail: "Last engineer: Sam, reliable and on time.", type: "note", area: "Home", daysAgo: 9 },
  { id: "m9", title: "Budget target: 20% savings rate", detail: "Set during the January review.", type: "note", area: "Money", daysAgo: 11 },
  { id: "m10", title: "Community AI learning hub", detail: "Peer groups that learn with shared agents.", type: "idea", area: "Ideas", daysAgo: 12 },
  { id: "m11", title: "Sleep target: 7.5 hours", detail: "Lights out by 10:45 PM on weekdays.", type: "note", area: "Health", daysAgo: 14 },
];

/* Ideas */

export interface Idea {
  id: string;
  title: string;
  tag: string;
  starred: boolean;
}

export const SEED_IDEAS: Idea[] = [
  { id: "i1", title: "AI-powered nutrition app", tag: "Product", starred: true },
  { id: "i2", title: "Smart home dashboard", tag: "Home", starred: true },
  { id: "i3", title: "Community AI learning hub", tag: "Projects", starred: true },
];

/* Goals */

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  area: string;
  due: string;
  status: string;
  insight: string;
  milestones: Milestone[];
}

const ms = (titles: string[], done: number): Milestone[] =>
  titles.map((title, i) => ({ id: `ms-${title.slice(0, 12)}-${i}`, title, done: i < done }));

export const SEED_GOALS: Goal[] = [
  {
    id: "g1",
    title: "Launch Nexus OS beta",
    area: "Work",
    due: "90-day plan",
    status: "Milestone due this week",
    insight: "The agent engine is the bottleneck. Two focus blocks this week keep the integrations phase on schedule.",
    milestones: ms(
      ["Product architecture and auth", "Dashboard and AI memory", "Goals, tasks and calendar", "AI agent execution engine", "Gmail and Calendar integrations", "Automation workflows", "Billing and onboarding", "Beta launch"],
      3,
    ),
  },
  {
    id: "g2",
    title: "Run a half marathon",
    area: "Health",
    due: "14 weeks",
    status: "Long run overdue",
    insight: "You've missed one long run. Saturday morning is free, and your knee note suggests a trail route.",
    milestones: ms(["Run 5 km without stopping", "Run 10 km", "Complete a 15 km trail run", "Taper week", "Race day"], 2),
  },
  {
    id: "g3",
    title: "Build a $20k safety fund",
    area: "Money",
    due: "8 months",
    status: "On track",
    insight: "Cancelling unused subscriptions would bring this goal forward by about three weeks.",
    milestones: ms(["Set a monthly transfer", "Reach $5,000", "Reach $10,000", "Reach $15,000", "Reach $20,000"], 3),
  },
  {
    id: "g4",
    title: "Reach B1 Spanish",
    area: "Learning",
    due: "6 months",
    status: "5-day streak",
    insight: "Short daily sessions are working. Add one conversation practice a week to reach B1 on time.",
    milestones: ms(["Finish A1 course", "Finish A2 course", "Hold a 10-minute conversation", "Pass a B1 mock exam"], 1),
  },
];

export function goalProgress(g: Goal) {
  if (g.milestones.length === 0) return 0;
  return Math.round((g.milestones.filter((m) => m.done).length / g.milestones.length) * 100);
}

/* Planner */

export interface CalEvent {
  id: string;
  title: string;
  /** Monday = 0 */
  day: number;
  start: number;
  duration: number;
  area: LifeArea;
}

export const SEED_EVENTS: CalEvent[] = [
  { id: "e1", title: "Deep work: Agent engine", day: 0, start: 8, duration: 2.5, area: "Work" },
  { id: "e2", title: "Team stand-up", day: 0, start: 11, duration: 0.75, area: "Work" },
  { id: "e3", title: "Gym", day: 0, start: 18, duration: 1, area: "Health" },
  { id: "e4", title: "Product review", day: 1, start: 10, duration: 1.5, area: "Work" },
  { id: "e5", title: "Spanish lesson", day: 1, start: 17, duration: 1, area: "Learning" },
  { id: "e6", title: "Deep work: Q2 deck", day: 2, start: 8, duration: 2, area: "Work" },
  { id: "e7", title: "Lunch with Sarah", day: 2, start: 12.5, duration: 1, area: "Family" },
  { id: "e8", title: "Investor call", day: 3, start: 9, duration: 1, area: "Work" },
  { id: "e9", title: "Interval run", day: 3, start: 18, duration: 1, area: "Health" },
  { id: "e10", title: "Weekly planning", day: 4, start: 9, duration: 1, area: "Admin" },
  { id: "e11", title: "Family dinner", day: 4, start: 19, duration: 1.5, area: "Family" },
  { id: "e12", title: "Long trail run", day: 5, start: 8, duration: 2, area: "Health" },
  { id: "e13", title: "Call Mom", day: 6, start: 11, duration: 0.75, area: "Family" },
  { id: "e14", title: "Weekly review", day: 6, start: 18, duration: 0.75, area: "Admin" },
];

export interface Habit {
  id: string;
  title: string;
  streak: number;
  /** Monday first */
  week: boolean[];
}

export const SEED_HABITS: Habit[] = [
  { id: "r1", title: "Morning journal", streak: 12, week: [true, true, true, true, false, false, false] },
  { id: "r2", title: "Move for 30 minutes", streak: 5, week: [true, false, true, true, false, false, false] },
  { id: "r3", title: "Inbox zero by 6 PM", streak: 3, week: [true, true, false, true, false, false, false] },
  { id: "r4", title: "Read 20 pages", streak: 9, week: [true, true, true, false, false, false, false] },
  { id: "r5", title: "Lights out by 10:45", streak: 2, week: [false, true, true, true, false, false, false] },
];

/* Analytics. Each life area keeps one colour everywhere it is charted. */

export type LifeArea = "Work" | "Health" | "Learning" | "Family" | "Admin";

export const AREA_COLORS: Record<LifeArea, string> = {
  Work: "#8b5cf6",
  Health: "#ec4899",
  Learning: "#0ea5c6",
  Family: "#d97706",
  Admin: "#10a877",
};

export const AREAS = Object.keys(AREA_COLORS) as LifeArea[];

export type RangeKey = "week" | "month" | "quarter";

export interface RangeData {
  label: string;
  compare: string;
  focus: number;
  focusDelta: number;
  tasks: number;
  tasksNote: string;
  saved: string;
  savedMinutes: number;
  completion: number;
  series: number[];
  labels: string[];
}

const trail = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

export const RANGES: Record<RangeKey, RangeData> = {
  week: {
    label: "This Week",
    compare: "last week",
    focus: 32.5,
    focusDelta: 8,
    tasks: 47,
    tasksNote: "in 5 days",
    saved: "6h 40m",
    savedMinutes: 400,
    completion: 86,
    series: [3.1, 3.6, 3.3, 4.2, 3.9, 4.7, 4.3, 5.1, 4.8, 5.6, 5.2, 6.4, 6.0, 7.8],
    labels: trail(14, "Session"),
  },
  month: {
    label: "This Month",
    compare: "last month",
    focus: 138,
    focusDelta: 12,
    tasks: 186,
    tasksNote: "in 30 days",
    saved: "27h 15m",
    savedMinutes: 1635,
    completion: 81,
    series: [18, 22, 21, 26, 24, 27, 30, 28, 33, 31, 36, 35, 39, 44],
    labels: trail(14, "Day"),
  },
  quarter: {
    label: "This Quarter",
    compare: "last quarter",
    focus: 402,
    focusDelta: 17,
    tasks: 561,
    tasksNote: "in 90 days",
    saved: "81h 30m",
    savedMinutes: 4890,
    completion: 78,
    series: [70, 76, 74, 82, 88, 85, 93, 98, 96, 104, 110, 108, 118, 126],
    labels: trail(14, "Week"),
  },
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const WEEK_BY_AREA: { day: string; values: Record<LifeArea, number> }[] = [
  { day: "Mon", values: { Work: 6.5, Health: 1, Learning: 0.5, Family: 1, Admin: 0.5 } },
  { day: "Tue", values: { Work: 5.5, Health: 0.5, Learning: 1, Family: 1.5, Admin: 0.5 } },
  { day: "Wed", values: { Work: 7, Health: 1, Learning: 0.5, Family: 1, Admin: 1 } },
  { day: "Thu", values: { Work: 5, Health: 1, Learning: 1, Family: 2, Admin: 0.5 } },
  { day: "Fri", values: { Work: 4.5, Health: 0.5, Learning: 0.5, Family: 3, Admin: 1 } },
  { day: "Sat", values: { Work: 1, Health: 2.5, Learning: 1, Family: 4, Admin: 0.5 } },
  { day: "Sun", values: { Work: 0.5, Health: 1, Learning: 1.5, Family: 4.5, Admin: 1 } },
];

export const ANALYTICS_INSIGHTS = [
  { title: "Your best focus is before 11 AM", detail: "62% of completed deep work happens in the morning. Keep meetings after 10." },
  { title: "Thursdays run long", detail: "Meetings overrun by 38 minutes on average. Planner can add buffers." },
  { title: "Workouts lift your next-day output", detail: "Task completion is 14% higher the day after you train." },
];

/* Automations */

export type AppId = "gmail" | "calendar" | "slack" | "notion" | "github" | "drive" | "linear" | "stripe";

export interface AppDef {
  id: AppId;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
}

export const APPS: AppDef[] = [
  { id: "gmail", name: "Gmail", desc: "Triage, drafts and receipts", icon: Mail, color: "#f472b6" },
  { id: "calendar", name: "Google Calendar", desc: "Events and focus blocks", icon: CalendarDays, color: "#60a5fa" },
  { id: "slack", name: "Slack", desc: "Digests and mentions", icon: Hash, color: "#a78bfa" },
  { id: "notion", name: "Notion", desc: "Notes and project docs", icon: BookOpen, color: "#e5e0f5" },
  { id: "github", name: "GitHub", desc: "Issues and pull requests", icon: GitBranch, color: "#c4a5ff" },
  { id: "drive", name: "Google Drive", desc: "Files and documents", icon: HardDrive, color: "#34d399" },
  { id: "linear", name: "Linear", desc: "Tasks and project cycles", icon: ListChecks, color: "#818cf8" },
  { id: "stripe", name: "Stripe", desc: "Billing and revenue", icon: CreditCard, color: "#22d3ee" },
];

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: string[];
  enabled: boolean;
  runs: number;
  lastRun: number | string;
}

export const SEED_WORKFLOWS: Workflow[] = [
  { id: "w1", name: "Morning Inbox Triage", trigger: "Every day at 7:00 AM", steps: ["Scan Gmail", "Classify with AI Brain", "Draft replies", "Send to Action Center"], enabled: true, runs: 128, lastRun: "2 min ago" },
  { id: "w2", name: "Calendar Guard", trigger: "New meeting invite", steps: ["Check for conflicts", "Protect focus blocks", "Suggest a better time"], enabled: true, runs: 64, lastRun: "5 min ago" },
  { id: "w3", name: "Slack Digest", trigger: "Weekdays at 5:00 PM", steps: ["Collect mentions", "Summarize threads", "Post to Morning Brief"], enabled: false, runs: 41, lastRun: "1 hr ago" },
  { id: "w4", name: "Receipt Capture", trigger: "New receipt email", steps: ["Extract totals", "File to AI Brain", "Update Life Analytics"], enabled: true, runs: 212, lastRun: "3 hr ago" },
  { id: "w5", name: "Weekly Review", trigger: "Sundays at 6:00 PM", steps: ["Gather wins", "Score goals", "Draft next week"], enabled: true, runs: 26, lastRun: "2d ago" },
];

export const WORKFLOW_TEMPLATES = [
  { trigger: "New email from a VIP", steps: ["Summarize email", "Draft a reply", "Send to Action Center"] },
  { trigger: "Task overdue by 1 day", steps: ["Find a free slot", "Reschedule the task", "Notify me"] },
  { trigger: "New document in Drive", steps: ["Read the document", "Extract key facts", "File to AI Brain"] },
];

/* Notifications */

export interface Notice {
  id: string;
  title: string;
  detail: string;
  at: number | string;
  read: boolean;
  href?: string;
}

export const SEED_NOTICES: Notice[] = [
  { id: "n1", title: "8 actions need review", detail: "Your agents have prepared work for approval.", at: "8 min ago", read: false, href: "/actions" },
  { id: "n2", title: "Long run overdue", detail: "Goal Intelligence moved it to Saturday morning.", at: "1 hr ago", read: false, href: "/goals" },
  { id: "n3", title: "Morning Inbox Triage finished", detail: "12 emails sorted, 2 replies drafted.", at: "2 hr ago", read: true, href: "/automations" },
];

/* Privacy */

export type Permission = "read" | "write" | "send" | "spend";
export const PERMISSIONS: Permission[] = ["read", "write", "send", "spend"];

export const SEED_PERMISSIONS: Record<AgentId, Permission[]> = {
  guardian: ["read"],
  planner: ["read", "write"],
  researcher: ["read"],
  money: ["read"],
  creator: ["read", "write"],
  relationship: ["read", "write", "send"],
  home: ["read", "write"],
  career: ["read", "write"],
  wellness: ["read"],
  builder: ["read", "write"],
};

export const AUDIT_LOG = [
  { who: "Planner", what: "Read your calendar", at: "4 min ago" },
  { who: "Money", what: "Read bank statement summary", at: "32 min ago" },
  { who: "Creator", what: "Wrote a draft to Action Center", at: "1 hr ago" },
  { who: "Researcher", what: "Read 3 notes tagged Work", at: "3 hr ago" },
  { who: "You", what: "Changed auto-delete to 90 days", at: "Yesterday" },
];

/* Roadmap */

export const ROADMAP = [
  { days: "Days 1-15", title: "Foundation", items: "Product architecture, authentication, dashboard, AI memory" },
  { days: "Days 16-30", title: "Personal context", items: "Goals, tasks, calendar and personal context" },
  { days: "Days 31-45", title: "Agent engine", items: "AI agent execution engine" },
  { days: "Days 46-60", title: "Integrations", items: "Gmail, Calendar and third-party integrations" },
  { days: "Days 61-75", title: "Automation", items: "Automation workflows and analytics" },
  { days: "Days 76-90", title: "Launch", items: "Billing, onboarding, beta launch" },
];
