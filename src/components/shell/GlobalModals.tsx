"use client";

import { Check, Clock, Copy, Rocket, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Btn, Modal } from "@/components/ui";
import { ACTION_ICONS, AGENTS, agentById, type AgentId } from "@/lib/data";
import { useLiveStats } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

function LaunchModal() {
  const launch = useStore((s) => s.launch);
  const setUi = useStore((s) => s.setUi);
  const launchAgent = useStore((s) => s.launchAgent);
  const online = useStore((s) => s.online);
  const safeMode = useStore((s) => s.safeMode);
  const [agent, setAgent] = useState<AgentId>("planner");
  const [task, setTask] = useState("");

  useEffect(() => {
    if (launch.open) {
      setAgent(launch.agent ?? "planner");
      setTask(launch.task ?? "");
    }
  }, [launch]);

  const def = agentById(agent);
  const close = () => setUi({ launch: { open: false } });

  return (
    <Modal open={launch.open} onClose={close} title="Launch an Agent" subtitle="Choose who handles it and describe the task." className="max-w-2xl">
      <div className="mt-4 grid grid-cols-5 gap-2 max-sm:grid-cols-3">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-pressed={a.id === agent}
            onClick={() => setAgent(a.id)}
            className={cn("nx-tile flex cursor-pointer flex-col items-center gap-1 px-1 py-2.5 text-xs", a.id === agent ? "!border-nx-lilac !bg-nx-violet/20 text-white" : "text-fg-2")}
          >
            <a.icon className="size-5.5" style={{ color: a.color }} strokeWidth={1.7} />
            {a.name}
          </button>
        ))}
      </div>
      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (task.trim() && online) launchAgent(agent, task.trim());
        }}
      >
        <label htmlFor="agent-task" className="text-xs text-fg-2">
          What should {def.name} do?
        </label>
        <input id="agent-task" autoFocus value={task} onChange={(e) => setTask(e.target.value)} placeholder={def.suggestions[0]} className="nx-input mt-1.5" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {def.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => setTask(s)} className="cursor-pointer rounded-full border border-line px-2.5 py-1 text-xs text-fg-2 hover:border-nx-lilac hover:text-fg">
              {s}
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-fg-3">
            {!online ? "Agents are paused. Turn AI Online back on to launch." : safeMode ? "Safe Mode: the result waits for your approval." : "Auto Mode: the agent finishes without approval."}
          </span>
          <Btn type="submit" tone="rose" disabled={!task.trim() || !online}>
            <Rocket className="size-4" /> Launch {def.name}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}

function ReviewModal() {
  const id = useStore((s) => s.reviewing);
  const item = useStore((s) => s.actions.find((a) => a.id === id));
  const setUi = useStore((s) => s.setUi);
  const resolve = useStore((s) => s.resolveAction);
  const snooze = useStore((s) => s.snoozeAction);
  const close = () => setUi({ reviewing: null });
  const Icon = item ? ACTION_ICONS[item.icon] : Sparkles;

  return (
    <Modal open={!!item} onClose={close}>
      {item && (
        <>
          <div className="flex items-center gap-3 pr-8">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-nx-violet/20 text-nx-lilac">
              <Icon className="size-5.5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg leading-6 font-semibold">{item.title}</h2>
              <p className="text-xs text-fg-3">Prepared by {agentById(item.agent).name}</p>
            </div>
            {(item.value ?? item.priority) && <span className="ml-auto text-sm font-semibold whitespace-nowrap">{item.value ?? item.priority}</span>}
          </div>
          <p className="mt-4 text-sm leading-6 text-fg-2">{item.summary}</p>
          {item.result && (
            <div className="relative mt-3">
              <pre aria-label="Agent result" className="nx-tile max-h-72 overflow-y-auto px-3 py-2.5 pr-16 font-sans text-[0.8125rem] leading-6 whitespace-pre-wrap text-fg">
                {item.result}
              </pre>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(item.result ?? "");
                  useStore.getState().toast("Copied");
                }}
                className="absolute top-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-md border border-line bg-[#1c1138] px-2 py-1 text-xs text-fg-2 hover:text-fg"
              >
                <Copy className="size-3.5" /> Copy
              </button>
            </div>
          )}
          <div className="nx-tile mt-3 flex items-center gap-2 px-3 py-2 text-[0.8125rem] text-fg">
            <Sparkles className="size-4 text-nx-amber" /> {item.impact}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Btn tone="ghost" onClick={() => snooze(item.id)}>
              <Clock className="size-4" /> Snooze
            </Btn>
            <Btn tone="rose" onClick={() => resolve(item.id, "declined")}>
              <X className="size-4" /> Decline
            </Btn>
            <Btn tone="green" onClick={() => resolve(item.id, "approved")}>
              <Check className="size-4" /> Approve
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

function BriefModal() {
  const open = useStore((s) => s.briefOpen);
  const setUi = useStore((s) => s.setUi);
  const priorities = useStore((s) => s.priorities);
  const actions = useStore((s) => s.actions);
  const goals = useStore((s) => s.goals);
  const name = useStore((s) => s.profile.name);
  const mail = useStore((s) => s.google?.mail);
  const close = () => setUi({ briefOpen: false });
  const openItems = priorities.filter((p) => !p.done);
  const week = useLiveStats();

  return (
    <Modal open={open} onClose={close} title="Your Morning Brief" subtitle="Prepared from your calendar, goals and memories." className="max-w-xl">
      <div className="mt-4 flex items-start gap-3">
        <Mascot variant="head" className="w-12 shrink-0" />
        <p className="text-sm leading-6 text-fg-2">
          Hi {name}, you have {openItems.length} open {openItems.length === 1 ? "priority" : "priorities"} and {actions.length} {actions.length === 1 ? "action" : "actions"} to review. {" "}
          {week.focusDelta === null
            ? `You have ${week.focus} hrs of focus time on your calendar this week.`
            : `Focus time is ${week.focusDelta >= 0 ? "up" : "down"} ${Math.abs(week.focusDelta)}% on ${week.compare}, so protect your morning block and clear approvals after lunch.`}
        </p>
      </div>
      <h3 className="mt-4 text-xs font-semibold tracking-wide text-fg-3 uppercase">Start with</h3>
      <ul className="mt-1.5 space-y-1.5 text-sm">
        {openItems.slice(0, 3).map((p) => (
          <li key={p.id} className="nx-tile px-3 py-2">
            {p.title}
          </li>
        ))}
        {openItems.length === 0 && <li className="nx-tile px-3 py-2 text-fg-2">All priorities are done.</li>}
      </ul>
      {mail && mail.length > 0 && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-fg-3 uppercase">Unread email</h3>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            {mail.slice(0, 4).map((m) => (
              <li key={m.id} className="nx-tile px-3 py-2">
                <span className="block truncate text-fg">{m.subject}</span>
                <span className="block truncate text-xs text-fg-3">{m.from}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {goals[0] && (
        <>
          <h3 className="mt-4 text-xs font-semibold tracking-wide text-fg-3 uppercase">Watch out for</h3>
          <p className="mt-1.5 text-sm leading-6 text-fg-2">{goals[0].insight}</p>
        </>
      )}
      <div className="mt-5 flex justify-end">
        <Link href="/planner" onClick={close} className="nx-btn h-8.5 px-5 text-[0.8125rem]">
          Open Life Planner
        </Link>
      </div>
    </Modal>
  );
}

export function GlobalModals() {
  return (
    <>
      <LaunchModal />
      <ReviewModal />
      <BriefModal />
    </>
  );
}
