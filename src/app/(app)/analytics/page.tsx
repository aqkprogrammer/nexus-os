"use client";

import { motion } from "motion/react";
import { Lightbulb } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { AreaChart, Heatmap, Legend, StackedBars } from "@/components/charts";
import { Card, CountUp, Page, Segmented, Stat } from "@/components/ui";
import { ANALYTICS_INSIGHTS, AREA_COLORS, AREAS, DAYS, RANGES, type RangeKey } from "@/lib/data";
import { hoursByDay, useLiveStats } from "@/lib/stats";
import { useStore } from "@/lib/store";

const OPTIONS = (Object.keys(RANGES) as RangeKey[]).map((value) => ({ value, label: RANGES[value].label }));
const hours = (v: number) => `${v.toFixed(1)} hrs`;
const whole = (v: number) => Math.round(v).toLocaleString("en-US");
const percent = (v: number) => `${Math.round(v)}%`;

/** Sixteen weeks of a stable, seeded habit pattern (0 to 4 completed habits). */
const HEAT_WEEKS = Array.from({ length: 16 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => {
    const v = (((w * 31 + d * 17 + 7) * 2654435761) >>> 0) % 5;
    return Math.min(4, Math.round(v * (0.55 + w * 0.03)) + (d < 5 ? 1 : 0));
  }),
);

const EMPTY_WEEKS = HEAT_WEEKS.map((week) => week.map(() => 0));

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("week");
  const [view, setView] = useState<"chart" | "table">("chart");
  const d = useLiveStats(range);
  const sample = useStore((s) => s.sample);
  const habits = useStore((s) => s.habits);
  const goals = useStore((s) => s.goals);
  const events = useStore((s) => s.events);
  const byDay = useMemo(() => hoursByDay(events), [events]);

  const totals = useMemo(() => AREAS.map((a) => ({ area: a, hours: byDay.reduce((sum, r) => sum + r.values[a], 0) })).sort((x, y) => y.hours - x.hours), [byDay]);
  const maxArea = totals[0].hours || 1;
  const tip = useCallback((v: number) => (range === "week" ? `${v.toFixed(1)} hrs` : `${v.toFixed(0)} hrs`), [range]);

  const logged = habits.flatMap((h) => h.week).filter(Boolean).length;
  const thisWeek = DAYS.map((_, day) => Math.min(4, habits.filter((h) => h.week[day]).length));

  return (
    <Page title="Life Analytics" subtitle="Progress, productivity and insights." actions={sample && <Segmented id="range" value={range} options={OPTIONS} onChange={setRange} />}>
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Focus time" value={<CountUp to={d.focus} format={hours} />} note={d.focusDelta === null ? "Scheduled this week" : `${d.focusDelta >= 0 ? "Up" : "Down"} ${Math.abs(d.focusDelta)}% vs ${d.compare}`} />
        <Stat label="Tasks done" value={<CountUp to={d.tasks} format={whole} />} note={d.tasksNote} delay={0.05} />
        <Stat label="Time saved by agents" value={d.saved} note="Automations and agent runs" delay={0.1} />
        <Stat label="Plan completion" value={<CountUp to={d.completion} format={percent} />} note={`Across ${goals.length} active goals`} delay={0.15} />
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <Card title="Focus Trend" subtitle={sample ? `Hours of deep work, ${d.label.toLowerCase()}` : "Hours of work and learning scheduled each day"} delay={0.1} className="!overflow-visible xl:col-span-3">
          <AreaChart key={range} data={d.series} labels={d.labels} format={tip} label={`Focus trend ${d.label}`} axis className="mt-2 h-60" color="#b57bff" />
        </Card>

        <Card
          title="Time by Life Area"
          subtitle="Scheduled hours per day, from your calendar"
          delay={0.16}
          className="!overflow-visible xl:col-span-2"
          right={
            <Segmented
              id="view"
              value={view}
              options={[
                { value: "chart", label: "Chart" },
                { value: "table", label: "Table" },
              ]}
              onChange={setView}
            />
          }
        >
          {view === "chart" ? (
            <>
              <div className="mb-2 mt-1">
                <Legend />
              </div>
              <StackedBars rows={byDay} />
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="mt-2 w-full text-right text-xs tabular-nums">
                <caption className="sr-only">Hours per day by life area</caption>
                <thead>
                  <tr className="text-fg-3">
                    <th className="py-1 text-left font-medium">Day</th>
                    {AREAS.map((a) => (
                      <th key={a} className="px-1 font-medium">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byDay.map((r) => (
                    <tr key={r.day} className="border-t border-white/6 text-fg-2">
                      <th className="py-1.5 text-left font-medium text-fg">{r.day}</th>
                      {AREAS.map((a) => (
                        <td key={a} className="px-1">
                          {r.values[a]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Weekly Balance" subtitle="Scheduled hours by life area" delay={0.2} className="xl:col-span-2">
          <ul className="mt-1 space-y-2.5">
            {totals.map((t, i) => (
              <li key={t.area} className="grid grid-cols-[4.5rem_minmax(0,1fr)_3rem] items-center gap-2 text-xs">
                <span className="text-fg-2">{t.area}</span>
                <span className="h-2.5">
                  <motion.span
                    className="block h-full rounded-r"
                    style={{ background: AREA_COLORS[t.area] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(t.hours / maxArea) * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                  />
                </span>
                <span className="text-right text-fg tabular-nums">
                  {t.hours} {t.hours === 1 ? "hr" : "hrs"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Routine Consistency" subtitle={`${logged} check-ins logged this week`} delay={0.24} className="xl:col-span-3">
          {/* The earlier weeks are invented, so a real account shows them empty. */}
          <Heatmap weeks={[...(sample ? HEAT_WEEKS : EMPTY_WEEKS).slice(0, -1), thisWeek]} />
        </Card>

        <Card title="What Nexus Noticed" delay={0.28} className="xl:col-span-5" bodyClass="!pt-1">
          {!sample && <p className="py-2 text-sm text-fg-2">Nexus needs a few weeks of your activity before it can spot patterns worth sharing.</p>}
          <ul className="grid gap-2 md:grid-cols-3">
            {(sample ? ANALYTICS_INSIGHTS : []).map((i) => (
              <li key={i.title} className="nx-tile flex gap-2.5 p-3">
                <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-nx-amber" />
                <span>
                  <span className="block text-sm text-fg">{i.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-fg-2">{i.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}
