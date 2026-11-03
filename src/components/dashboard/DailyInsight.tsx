"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useCallback } from "react";
import { AreaChart } from "@/components/charts";
import { Card, Ring } from "@/components/ui";
import { useLiveStats, type Stats } from "@/lib/stats";
import { useStore } from "@/lib/store";

const SERIES = [8, 11, 9, 13, 12, 16, 15, 20, 19, 26, 25, 33, 38, 52];
const LABELS = SERIES.map((_, i) => `Week ${i + 1}`);

const focusTip = (v: number) => `${v} hrs scheduled`;

export function DailyInsight() {
  const sample = useStore((s) => s.sample);
  const stats = useLiveStats();
  return sample ? <SampleInsight saved={stats.saved} /> : <OwnInsight stats={stats} />;
}

/** Real accounts see only what their own workspace shows. */
function OwnInsight({ stats }: { stats: Stats }) {
  const started = stats.tasks > 0 || stats.focus > 0;
  return (
    <Card
      delay={0.46}
      title={
        <span className="flex items-center gap-2.5">
          <Sparkles className="size-5.5 animate-twinkle text-nx-amber" strokeWidth={1.7} />
          Daily Insight
        </span>
      }
      bodyClass="relative !px-5"
    >
      <p className="mt-2 max-w-[14rem] text-[0.8125rem] leading-5 text-fg-2">
        {started
          ? `You've finished ${stats.tasks} ${stats.tasks === 1 ? "task" : "tasks"} and have ${stats.focus} hrs of focus time on your calendar this week.`
          : "Add priorities, goals and events, and Nexus will start turning them into insights."}
      </p>
      <div className="relative mt-auto min-h-[6.6rem] flex-1">
        <AreaChart data={stats.series} labels={stats.labels} format={focusTip} label="Focus hours scheduled each day this week" className="absolute inset-x-0 bottom-3 h-[85%]" color="#c084fc" />
        <div className="absolute top-[-1.5rem] right-0 rounded-full bg-[#1a0e3a]/80" title="Average progress across your goals">
          <Ring value={stats.completion} size="4.5rem" stroke={6}>
            <span className="text-xl font-semibold">
              {stats.completion}
              <span className="text-xs">%</span>
            </span>
          </Ring>
        </div>
      </div>
      <p className="text-[0.6875rem] text-fg-3">Goal progress and focus time this week</p>
    </Card>
  );
}

function SampleInsight({ saved }: { saved: string }) {
  const tip = useCallback((v: number) => `${v} hrs saved`, []);
  return (
    <Card
      delay={0.46}
      title={
        <span className="flex items-center gap-2.5">
          <Sparkles className="size-5.5 animate-twinkle text-nx-amber" strokeWidth={1.7} />
          Daily Insight
        </span>
      }
      bodyClass="relative !px-5"
    >
      <p className="mt-2 text-[0.8125rem] leading-5 text-fg-2">
        You saved {saved} this week with
        <br />
        smarter automations.
      </p>
      <p className="mt-3 text-[0.8125rem] leading-5 text-fg-2">
        Keep it up! You&apos;re in the top 12%
        <br />
        of our users. <span aria-hidden>🚀</span>
      </p>
      <div className="relative mt-auto min-h-[6.6rem] flex-1">
        <AreaChart data={SERIES} labels={LABELS} format={tip} label="Hours saved by automations, rising each week" className="absolute inset-x-0 bottom-3 h-[85%]" color="#c084fc" />
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9, type: "spring" }} className="absolute top-[-1.5rem] right-0">
          <span className="absolute inset-0 animate-glow rounded-full bg-nx-pink/30 blur-xl" />
          <span className="relative block rounded-full bg-[#1a0e3a]/80">
            <Ring value={72} size="4.5rem" stroke={6}>
              <span className="text-xl font-semibold">
                12<span className="text-xs">%</span>
              </span>
            </Ring>
          </span>
        </motion.div>
      </div>
      <p className="text-[0.6875rem] text-fg-3">Insight based on your activity patterns</p>
    </Card>
  );
}
