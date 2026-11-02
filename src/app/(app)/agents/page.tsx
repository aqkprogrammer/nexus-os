"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar, Btn, Card, enter, Modal, Page, Pill, Stat } from "@/components/ui";
import { AGENTS, agentById, RUN_STEPS, type AgentDef } from "@/lib/data";
import { useLiveStats } from "@/lib/stats";
import { useStore, type AgentRun } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

const BASE_RUNS: Record<string, number> = { guardian: 312, planner: 248, researcher: 96, money: 174, creator: 121, relationship: 88, home: 53, career: 37, wellness: 142, builder: 71 };

function RunRow({ run }: { run: AgentRun }) {
  const def = agentById(run.agent);
  const pct = Math.round((run.step / RUN_STEPS.length) * 100);
  const live = run.status === "running";
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="nx-tile px-3 py-2.5">
      <div className="flex items-center gap-3">
        <def.icon className="size-5.5 shrink-0" style={{ color: def.color }} strokeWidth={1.7} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-fg">{run.task}</div>
          <div className="text-xs text-fg-3" suppressHydrationWarning>
            {def.name} · {live ? RUN_STEPS[run.step] : `Finished ${timeAgo(run.at)}`}
          </div>
        </div>
        {live ? <Loader className="size-4 animate-spin text-nx-lilac" /> : <Check className="size-4 text-nx-green" />}
      </div>
      {live && <Bar value={Math.max(8, pct)} tone="pink" className="mt-2 !h-1.5" />}
    </motion.li>
  );
}

export default function AgentsPage() {
  const runs = useStore((s) => s.runs);
  const pending = useStore((s) => s.actions.length);
  const permissions = useStore((s) => s.permissions);
  const setUi = useStore((s) => s.setUi);
  const [detail, setDetail] = useState<AgentDef | null>(null);

  const { saved } = useLiveStats();

  const running = runs.filter((r) => r.status === "running");
  const busy = new Set(running.map((r) => r.agent));
  const totalRuns = Object.values(BASE_RUNS).reduce((a, b) => a + b, 0) + runs.length;

  return (
    <Page
      title="AI Agents"
      subtitle="Your team of specialists. They execute tasks autonomously and ask before anything sensitive."
      actions={
        <Btn tone="rose" onClick={() => setUi({ launch: { open: true } })}>
          <Rocket className="size-4" /> Launch an Agent
        </Btn>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Working now" value={running.length} note={running.length ? "Live below" : "All agents ready"} />
        <Stat label="Total runs" value={totalRuns.toLocaleString("en-US")} note="Since you joined" delay={0.05} />
        <Stat label="Awaiting approval" value={pending} note={<Link href="/actions" className="text-nx-lilac hover:underline">Open Action Center</Link>} delay={0.1} />
        <Stat label="Time saved" value={saved} note="This week" delay={0.15} />
      </div>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section id="team" className="grid scroll-mt-4 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {AGENTS.map((a, i) => (
            <motion.button
              key={a.id}
              type="button"
              {...enter(0.04 * i)}
              whileHover={{ y: -4 }}
              onClick={() => setDetail(a)}
              className="nx-card flex cursor-pointer flex-col items-start p-3.5 text-left"
            >
              <div className="flex w-full items-start justify-between">
                <span className="grid size-11 place-items-center rounded-xl" style={{ background: `${a.color}22`, boxShadow: `0 0 1rem ${a.color}33` }}>
                  <a.icon className="size-6" style={{ color: a.color }} strokeWidth={1.7} />
                </span>
                <Pill className={busy.has(a.id) ? "border-nx-green/40 text-nx-green" : "border-line text-fg-3"}>
                  <span className={cn("size-1.5 rounded-full", busy.has(a.id) ? "animate-pulse bg-nx-green" : "bg-fg-3")} />
                  {busy.has(a.id) ? "Working" : "Ready"}
                </Pill>
              </div>
              <div className="mt-3 text-[0.9375rem] font-semibold">{a.name}</div>
              <div className="text-xs text-fg-2">{a.desc}</div>
              <div className="mt-2.5 text-[0.6875rem] text-fg-3">{(BASE_RUNS[a.id] ?? 0) + runs.filter((r) => r.agent === a.id).length} runs</div>
            </motion.button>
          ))}
        </section>

        <Card id="activity" title="Live Activity" subtitle="Every run, step by step." delay={0.2} className="scroll-mt-4">
          <ul className="max-h-[27rem] space-y-1.5 overflow-y-auto">
            <AnimatePresence initial={false}>
              {runs.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </AnimatePresence>
            {runs.length === 0 && (
              <li className="py-12 text-center text-sm text-fg-3">
                No runs yet.
                <br />
                Launch an agent to watch it work.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)}>
        {detail && (
          <>
            <div className="flex items-center gap-3 pr-8">
              <span className="grid size-12 place-items-center rounded-xl" style={{ background: `${detail.color}22` }}>
                <detail.icon className="size-6.5" style={{ color: detail.color }} strokeWidth={1.7} />
              </span>
              <div>
                <h2 className="text-lg leading-6 font-semibold">{detail.name}</h2>
                <p className="text-xs text-fg-3">{detail.desc}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-fg-2">{detail.about}</p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs text-fg-2">
              <ShieldCheck className="size-4 text-nx-green" /> Permissions:
              {permissions[detail.id].map((p) => (
                <Pill key={p} className="border-line capitalize">
                  {p}
                </Pill>
              ))}
              {permissions[detail.id].length === 0 && <span>None</span>}
            </div>
            <h3 className="mt-4 text-xs font-semibold tracking-wide text-fg-3 uppercase">Try asking</h3>
            <ul className="mt-1.5 space-y-1.5">
              {detail.suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setDetail(null);
                      setUi({ launch: { open: true, agent: detail.id, task: s } });
                    }}
                    className="nx-tile w-full cursor-pointer px-3 py-2 text-left text-sm text-fg"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex justify-end">
              <Btn
                tone="rose"
                onClick={() => {
                  setDetail(null);
                  setUi({ launch: { open: true, agent: detail.id } });
                }}
              >
                <Rocket className="size-4" /> Launch {detail.name}
              </Btn>
            </div>
          </>
        )}
      </Modal>
    </Page>
  );
}
