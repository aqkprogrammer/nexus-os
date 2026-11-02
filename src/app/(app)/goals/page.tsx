"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Plus, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Bar, Btn, Card, Check3, enter, Modal, Page, Pill, Ring } from "@/components/ui";
import { goalProgress } from "@/lib/data";
import { draftPlan, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const selected = useStore((s) => s.selectedGoal);
  const setUi = useStore((s) => s.setUi);
  const addGoal = useStore((s) => s.addGoal);
  const toggleMilestone = useStore((s) => s.toggleMilestone);
  const scheduleNext = useStore((s) => s.scheduleNext);

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", area: "Work", due: "3 months" });
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);

  const goal = goals.find((g) => g.id === selected) ?? goals[0];
  const pct = goal ? goalProgress(goal) : 0;
  const next = goal?.milestones.find((m) => !m.done);

  const generate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim() || generating) return;
    const title = draft.title.trim();
    const steps = draftPlan(title);
    setGenerating(true);
    setPreview([]);
    steps.forEach((s, i) => setTimeout(() => setPreview((p) => [...p, s]), 240 * (i + 1)));
    setTimeout(
      () => {
        addGoal(title, draft.area, draft.due);
        setGenerating(false);
        setPreview([]);
        setDraft({ title: "", area: "Work", due: "3 months" });
        setCreating(false);
      },
      240 * steps.length + 700,
    );
  };

  return (
    <Page
      title="Goal Intelligence"
      subtitle="Turn long-term goals into action plans."
      actions={
        <Btn tone="rose" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New goal
        </Btn>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <ul className="space-y-2">
          {goals.map((g, i) => {
            const p = goalProgress(g);
            const on = g.id === goal?.id;
            return (
              <motion.li key={g.id} {...enter(i * 0.05)}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setUi({ selectedGoal: g.id })}
                  className={cn("nx-card flex w-full cursor-pointer items-center gap-3 p-3 text-left", on && "!border-nx-lilac shadow-[0_0_1.2rem_rgb(139_92_246_/_0.3)]")}
                >
                  <Ring value={p} size="3.4rem" stroke={9}>
                    <span className="text-xs font-semibold tabular-nums">{p}%</span>
                  </Ring>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium text-fg">{g.title}</span>
                    <span className="block truncate text-xs text-fg-3">
                      {g.area} · {g.due}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-nx-lilac">{g.status}</span>
                  </span>
                </button>
              </motion.li>
            );
          })}
          {goals.length === 0 && <li className="nx-card p-8 text-center text-sm text-fg-3">Add your first goal and Nexus will draft a plan.</li>}
        </ul>

        {goal && (
          <Card
            key={goal.id}
            title={goal.title}
            subtitle={`${goal.area} · ${goal.due}`}
            delay={0.08}
            right={
              <Btn size="sm" disabled={!next} onClick={() => scheduleNext(goal.id)}>
                <CalendarPlus className="size-3.5" /> Schedule next step
              </Btn>
            }
          >
            <div className="flex items-center gap-3 pt-1">
              <Bar value={pct} tone="pink" />
              <span className="text-sm font-semibold tabular-nums">{pct}%</span>
            </div>

            <div className="nx-tile mt-3 flex items-start gap-3 p-3">
              <Mascot variant="head" className="w-10 shrink-0" />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-nx-lilac">
                  <Sparkles className="size-3.5" /> Nexus recommends
                </div>
                <p className="mt-0.5 text-[0.8125rem] leading-5 text-fg-2">{goal.insight}</p>
              </div>
            </div>

            <h3 className="mt-4 mb-1 text-xs font-semibold tracking-wide text-fg-3 uppercase">Action plan</h3>
            <ol className="relative">
              <span className="absolute top-3 bottom-3 left-[0.53rem] w-px bg-line" aria-hidden />
              {goal.milestones.map((m, i) => (
                <motion.li key={m.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="relative flex items-center gap-3 py-1.5">
                  <span className="relative rounded-full bg-[#160c30]">
                    <Check3 on={m.done} onChange={() => toggleMilestone(goal.id, m.id)} label={m.title} />
                  </span>
                  <span className={cn("min-w-0 flex-1 text-sm", m.done ? "text-fg-3 line-through" : "text-fg")}>{m.title}</span>
                  {m.id === next?.id && <Pill className="border-nx-pink/40 text-[#ff9fdc]">Next</Pill>}
                </motion.li>
              ))}
            </ol>
          </Card>
        )}
      </div>

      <Modal open={creating} onClose={() => !generating && setCreating(false)} title="New goal" subtitle="Describe the outcome. Nexus drafts the plan.">
        <form className="mt-4 space-y-3" onSubmit={generate}>
          <label className="block text-xs text-fg-2">
            What do you want to achieve?
            <input autoFocus disabled={generating} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="nx-input mt-1.5" placeholder="Write my first book" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-fg-2">
              Life area
              <select disabled={generating} value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} className="nx-input mt-1.5">
                {["Work", "Health", "Money", "Learning", "Family"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-fg-2">
              Timeframe
              <select disabled={generating} value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} className="nx-input mt-1.5">
                {["1 month", "3 months", "6 months", "1 year"].map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <AnimatePresence>
            {generating && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                <li className="mb-1 flex items-center gap-1.5 text-xs text-nx-lilac">
                  <Target className="size-3.5 animate-spin" /> Drafting your plan
                </li>
                {preview.map((p) => (
                  <motion.li key={p} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="py-0.5 text-[0.8125rem] text-fg-2">
                    • {p}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          <div className="flex justify-end">
            <Btn type="submit" disabled={!draft.title.trim() || generating}>
              <Sparkles className="size-4" /> {generating ? "Generating" : "Generate plan"}
            </Btn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
