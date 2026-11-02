"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowRight, Check, Play, Plus, Zap } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { Btn, Card, Modal, Page, Pill, Stat, Toggle, enter } from "@/components/ui";
import { APPS, WORKFLOW_TEMPLATES, type Workflow } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

function FlowDiagram({ workflow, step }: { workflow: Workflow; step: number | null }) {
  const nodes = [workflow.trigger, ...workflow.steps];
  return (
    <div className="flex flex-wrap items-stretch gap-y-2 max-md:flex-col">
      {nodes.map((label, i) => {
        const lit = step !== null && i <= step;
        const current = step === i;
        return (
          <Fragment key={`${label}-${i}`}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, scale: current ? 1.05 : 1 }}
              transition={{ delay: step === null ? i * 0.06 : 0 }}
              className={cn(
                "relative flex min-w-[8.5rem] flex-1 flex-col justify-center rounded-xl border px-3 py-2.5 transition-colors",
                lit ? "border-nx-pink bg-nx-pink/12 shadow-[0_0_1rem_rgb(236_75_184_/_0.35)]" : "border-line bg-white/3",
              )}
            >
              <span className="text-[0.625rem] tracking-wide text-fg-3 uppercase">{i === 0 ? "Trigger" : `Step ${i}`}</span>
              <span className="text-[0.8125rem] leading-5 text-fg">{label}</span>
              {step !== null && lit && !current && <Check className="absolute top-2 right-2 size-3.5 text-nx-green" />}
            </motion.div>
            {i < nodes.length - 1 && (
              <div className="grid w-8 shrink-0 place-items-center text-nx-lilac max-md:h-5 max-md:w-full">
                <ArrowRight className="size-4 animate-pulse max-md:hidden" />
                <ArrowDown className="hidden size-4 animate-pulse max-md:block" />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default function AutomationsPage() {
  const workflows = useStore((s) => s.workflows);
  const apps = useStore((s) => s.apps);
  const online = useStore((s) => s.online);
  const toggleApp = useStore((s) => s.toggleApp);
  const toggleWorkflow = useStore((s) => s.toggleWorkflow);
  const runWorkflow = useStore((s) => s.runWorkflow);
  const addWorkflow = useStore((s) => s.addWorkflow);
  const toast = useStore((s) => s.toast);

  const [selected, setSelected] = useState("w1");
  const [step, setStep] = useState<number | null>(null);
  const [log, setLog] = useState<{ id: string; text: string }[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", template: 0 });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = workflows.find((w) => w.id === selected) ?? workflows[0];
  const active = workflows.filter((w) => w.enabled).length;
  const connected = APPS.filter((a) => apps[a.id]).length;
  const totalRuns = workflows.reduce((sum, w) => sum + w.runs, 0);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const run = () => {
    if (!current || step !== null) return;
    if (!online) {
      toast("Agents are paused. Turn AI Online back on to run.", "warn");
      return;
    }
    const total = current.steps.length + 1;
    let i = 0;
    setStep(0);
    timer.current = setInterval(() => {
      i += 1;
      if (i >= total) {
        if (timer.current) clearInterval(timer.current);
        setStep(null);
        runWorkflow(current.id);
        setLog((l) => [{ id: `${current.id}-${Date.now()}`, text: `${current.name} finished ${total - 1} steps` }, ...l].slice(0, 6));
        toast(`${current.name} finished`);
        return;
      }
      setStep(i);
    }, 750);
  };

  return (
    <Page
      title="Automation Hub"
      subtitle="Connect apps and automate workflows."
      actions={
        <Btn tone="rose" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New workflow
        </Btn>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active workflows" value={`${active} of ${workflows.length}`} note="Running on schedule" />
        <Stat label="Connected apps" value={`${connected} of ${APPS.length}`} note="Through MCP connectors" delay={0.05} />
        <Stat label="Total runs" value={totalRuns.toLocaleString("en-US")} note="All time" delay={0.1} />
        <Stat label="Time saved" value="6h 40m" note="This week" delay={0.15} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card id="workflows" title="Workflows" subtitle="Select one to inspect or run it." className="scroll-mt-4">
          <ul className="space-y-1.5">
            {workflows.map((w) => (
              <li key={w.id} className={cn("nx-tile flex items-center gap-2.5 px-3 py-2", w.id === current?.id && "!border-nx-lilac !bg-nx-violet/15")}>
                <button
                  type="button"
                  aria-pressed={w.id === current?.id}
                  onClick={() => {
                    if (step === null) setSelected(w.id);
                  }}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="block truncate text-sm text-fg">{w.name}</span>
                  <span className="block truncate text-xs text-fg-3">{w.trigger}</span>
                </button>
                <Toggle on={w.enabled} label={`${w.name} enabled`} onChange={() => toggleWorkflow(w.id)} />
              </li>
            ))}
          </ul>
        </Card>

        {current && (
          <Card
            title={current.name}
            subtitle={
              <span suppressHydrationWarning>
                {current.runs} runs · Last run {timeAgo(current.lastRun)}
              </span>
            }
            delay={0.08}
            right={
              <div className="flex items-center gap-2">
                <Pill className={current.enabled ? "border-nx-green/40 text-nx-green" : "border-nx-amber/40 text-nx-amber"}>{current.enabled ? "Active" : "Idle"}</Pill>
                <Btn size="sm" tone="green" disabled={step !== null} onClick={run}>
                  <Play className="size-3" /> {step !== null ? "Running" : "Run now"}
                </Btn>
              </div>
            }
          >
            <div className="my-auto py-3">
              <FlowDiagram workflow={current} step={step} />
            </div>
            <div className="border-t border-line/60 pt-2.5">
              <h3 className="mb-1.5 text-xs font-semibold text-fg-2">Run log</h3>
              <ul className="space-y-1 text-xs text-fg-2">
                <AnimatePresence initial={false}>
                  {log.map((l) => (
                    <motion.li key={l.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                      <Check className="size-3.5 text-nx-green" /> {l.text}
                    </motion.li>
                  ))}
                </AnimatePresence>
                {log.length === 0 && <li className="text-fg-3">Press Run now to watch this workflow execute.</li>}
              </ul>
            </div>
          </Card>
        )}
      </div>

      <section id="apps" className="mt-3 scroll-mt-4">
        <motion.h2 {...enter(0.14)} className="mb-2 text-base font-semibold">
          Connected apps
        </motion.h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {APPS.map((a, i) => (
            <motion.div key={a.id} {...enter(0.16 + i * 0.03)} className="nx-card flex items-center gap-3 p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: `${a.color}22` }}>
                <a.icon className="size-5" style={{ color: a.color }} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{a.name}</span>
                <span className="block truncate text-xs text-fg-3">{apps[a.id] ? a.desc : "Not connected"}</span>
              </span>
              <Toggle
                on={apps[a.id]}
                label={`Connect ${a.name}`}
                onChange={(on) => {
                  toggleApp(a.id);
                  toast(on ? `${a.name} connected` : `${a.name} disconnected`, "info");
                }}
              />
            </motion.div>
          ))}
        </div>
      </section>

      <Modal open={creating} onClose={() => setCreating(false)} title="New workflow" subtitle="Start from a template. Nexus handles the wiring.">
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim()) return;
            addWorkflow({ name: draft.name.trim(), ...WORKFLOW_TEMPLATES[draft.template] });
            setDraft({ name: "", template: 0 });
            setCreating(false);
            toast("Workflow created");
          }}
        >
          <label className="block text-xs text-fg-2">
            Name
            <input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="nx-input mt-1.5" placeholder="VIP email assistant" />
          </label>
          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-xs text-fg-2">Template</legend>
            {WORKFLOW_TEMPLATES.map((t, i) => (
              <button
                key={t.trigger}
                type="button"
                aria-pressed={draft.template === i}
                onClick={() => setDraft({ ...draft, template: i })}
                className={cn("nx-tile flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left", draft.template === i && "!border-nx-lilac !bg-nx-violet/15")}
              >
                <Zap className="size-4 shrink-0 text-nx-amber" />
                <span className="min-w-0">
                  <span className="block text-sm text-fg">{t.trigger}</span>
                  <span className="block truncate text-xs text-fg-3">{t.steps.join(" → ")}</span>
                </span>
              </button>
            ))}
          </fieldset>
          <div className="flex justify-end">
            <Btn type="submit" disabled={!draft.name.trim()}>
              Create workflow
            </Btn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
