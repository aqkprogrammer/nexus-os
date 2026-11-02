"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, ChevronRight, Dumbbell, Flag, Languages, PiggyBank, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AreaChart } from "@/components/charts";
import { Mascot } from "@/components/Mascot";
import { Btn, Card, Check3, CountUp, Ring } from "@/components/ui";
import { ACTION_ICONS, goalProgress, RANGES, type RangeKey } from "@/lib/data";
import { useLiveStats } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function MorningBrief() {
  const priorities = useStore((s) => s.priorities);
  const toggle = useStore((s) => s.togglePriority);
  const setUi = useStore((s) => s.setUi);

  return (
    <Card n={1} title="Morning Brief" delay={0.08} bodyClass="relative">
      <p className="text-xs font-medium text-fg-2">Top Priorities</p>
      <ul className="mt-2 space-y-2.5">
        {priorities.slice(0, 3).map((p) => (
          <li key={p.id} className="flex items-center gap-2.5">
            <Check3 on={p.done} onChange={() => toggle(p.id)} label={p.title} />
            <button type="button" onClick={() => toggle(p.id)} className={cn("max-w-[9.5rem] cursor-pointer truncate text-left text-[0.8125rem] transition-colors", p.done ? "text-fg-2" : "text-fg")}>
              {p.title}
            </button>
          </li>
        ))}
      </ul>
      <div className="pointer-events-none absolute right-1 bottom-10 animate-float-sm">
        <Mascot className="h-[7.2rem] w-auto" title="Nexus mascot holding a heart" />
      </div>
      <div className="mt-auto pt-3">
        <Btn className="relative min-w-[11.5rem]" onClick={() => setUi({ briefOpen: true })}>
          Open Brief <ArrowRight className="ml-auto size-3.5" />
        </Btn>
      </div>
    </Card>
  );
}

export function ActionCenter() {
  const actions = useStore((s) => s.actions);
  const setUi = useStore((s) => s.setUi);

  return (
    <Card id="tour-actions" n={2} title="Action Center" subtitle={<span className="text-nx-pink">{actions.length ? `${actions.length} awaiting your review` : "All clear"}</span>} delay={0.14}>
      <ul className="mt-1 flex-1">
        <AnimatePresence initial={false}>
          {actions.slice(0, 4).map((a) => {
            const Icon = ACTION_ICONS[a.icon];
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pb-1.5 text-xs">
                  <Icon className="size-3.5 shrink-0 text-nx-lilac" strokeWidth={1.8} />
                  <span className="min-w-0 flex-1 truncate text-fg">{a.title}</span>
                  <span className={cn("shrink-0 text-[0.6875rem] tabular-nums", a.priority === "High" ? "text-nx-rose" : a.priority === "Medium" ? "text-nx-amber" : "text-fg-2")}>
                    {a.value ?? a.priority}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUi({ reviewing: a.id })}
                    className="h-6.5 shrink-0 cursor-pointer rounded-md border border-nx-pink/40 bg-nx-pink/8 px-2 text-[0.6875rem] text-[#ff9fdc] transition-all hover:border-nx-pink hover:bg-nx-pink/20"
                  >
                    Review
                  </button>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {actions.length === 0 && <li className="py-6 text-center text-sm text-fg-3">Nothing needs your review right now.</li>}
      </ul>
      <div className="pt-3">
        <Link href="/actions" data-tone="rose" className="nx-btn h-8.5 min-w-[13.5rem] px-6 text-[0.8125rem]">
          Review Actions <ChevronRight className="ml-auto size-4" />
        </Link>
      </div>
    </Card>
  );
}

function RangeSelect({ value, onChange }: { value: RangeKey; onChange: (r: RangeKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-6.5 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white/4 px-2 text-[0.6875rem] text-fg-2 hover:text-fg"
      >
        {RANGES[value].label}
        <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 z-20 mt-1 w-28 rounded-lg border border-line bg-[#1c1138] p-1 shadow-xl"
          >
            {(Object.keys(RANGES) as RangeKey[]).map((r) => (
              <li key={r}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setOpen(false);
                  }}
                  className={cn("w-full cursor-pointer rounded px-2 py-1 text-left text-[0.6875rem] hover:bg-white/8", r === value ? "text-white" : "text-fg-2")}
                >
                  {RANGES[r].label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

const hrs = (v: number) => `${v.toFixed(1)} hrs`;
const count = (v: number) => Math.round(v).toLocaleString("en-US");

export function AnalyticsOverview() {
  const [range, setRange] = useState<RangeKey>("week");
  const d = useLiveStats(range);
  const up = d.focusDelta >= 0;
  const tip = useCallback((v: number) => `${v.toFixed(1)} hrs`, []);

  return (
    <Card n={3} tone="blue" title="Life Analytics" right={<RangeSelect value={range} onChange={setRange} />} delay={0.2} className="!overflow-visible">
      <p className="text-[0.6875rem] text-fg-2">Focus Time</p>
      <div className="text-xl leading-6 font-semibold">
        <CountUp to={d.focus} format={hrs} />
      </div>
      <p className="flex items-center gap-1 text-[0.6875rem] text-fg-3">
        {up ? <ArrowUp className="size-3 text-nx-green" /> : <ArrowDown className="size-3 text-nx-rose" />}
        <span className={up ? "text-nx-green" : "text-nx-rose"}>{Math.abs(d.focusDelta)}%</span> vs {d.compare}
      </p>
      <AreaChart data={d.series} labels={d.labels} format={tip} label={`Focus time ${d.label}`} className="my-1 min-h-[2.6rem] flex-1" color="#c084fc" />
      <dl className="grid grid-cols-2 gap-2 text-[0.6875rem]">
        <div>
          <dt className="text-fg-2">Tasks Done</dt>
          <dd className="text-[0.8125rem] leading-4.5 font-semibold text-fg">
            <CountUp to={d.tasks} format={count} />
          </dd>
          <dd className="text-fg-3">{d.tasksNote}</dd>
        </div>
        <div>
          <dt className="text-fg-2">Time Saved</dt>
          <dd className="text-[0.8125rem] leading-4.5 font-semibold text-fg">{d.saved}</dd>
          <dd className="text-fg-3">Auto-saved</dd>
        </div>
      </dl>
      <div className="pt-1.5">
        <Link href="/analytics" data-tone="blue" className="nx-btn h-8 w-[13.2rem] max-w-full px-6 text-[0.8125rem]">
          See Full Report <ArrowRight className="ml-auto size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

const GOAL_ICONS = [Rocket, Dumbbell, PiggyBank, Languages];

export function GoalRadar() {
  const goals = useStore((s) => s.goals);
  const setUi = useStore((s) => s.setUi);
  const router = useRouter();
  const open = (id: string) => {
    setUi({ selectedGoal: id });
    router.push("/goals");
  };

  return (
    <Card id="tour-goals" n={4} tone="violet" title="Goal Intelligence" delay={0.26}>
      <p className="text-xs text-fg-2">Goals that need you</p>
      <ul className="mt-1 flex-1 space-y-0.5">
        {goals.slice(0, 4).map((g, i) => {
          const Icon = GOAL_ICONS[i % GOAL_ICONS.length] ?? Flag;
          const pct = goalProgress(g);
          return (
            <li key={g.id}>
              <button type="button" onClick={() => open(g.id)} className="group flex w-full cursor-pointer items-center gap-2 rounded-lg py-0.5 text-left">
                <Ring value={pct} size="1.95rem" stroke={9}>
                  <Icon className="size-3.5 text-fg" strokeWidth={1.8} />
                </Ring>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-fg">{g.title}</span>
                  <span className="block truncate text-[0.6875rem] text-fg-3">{g.status}</span>
                </span>
                <span className="grid h-7 w-8 shrink-0 place-items-center rounded-md border border-line bg-nx-violet/10 text-[0.625rem] font-semibold text-nx-lilac transition-colors group-hover:border-nx-lilac tabular-nums">
                  {pct}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="pt-2">
        <Link href="/goals" className="nx-btn h-8 w-full text-[0.8125rem]">
          View All
        </Link>
      </div>
    </Card>
  );
}
