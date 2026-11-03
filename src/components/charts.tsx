"use client";

import { motion } from "motion/react";
import { useId, useState, type PointerEvent } from "react";
import { AREA_COLORS, AREAS, type LifeArea } from "@/lib/data";
import { cn, smoothPath } from "@/lib/utils";

const reveal = {
  initial: { clipPath: "inset(0 100% 0 0)" },
  animate: { clipPath: "inset(0 0% 0 0)" },
  transition: { duration: 1.4, ease: [0.4, 0, 0.2, 1] as const },
};

/** A single-series trend with an animated reveal, crosshair and tooltip. */
export function AreaChart({
  data,
  labels,
  format,
  color = "#b57bff",
  axis = false,
  label,
  className,
}: {
  data: number[];
  labels?: string[];
  format: (v: number) => string;
  color?: string;
  axis?: boolean;
  label: string;
  className?: string;
}) {
  const raw = useId();
  const gradient = `area${raw.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);

  const W = 400;
  const H = 120;
  const pad = 6;
  const min = axis ? 0 : Math.min(...data);
  const max = Math.max(...data);
  const y = (v: number) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const x = (i: number) => (i / (data.length - 1)) * W;
  const points = data.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smoothPath(points);
  const area = `${line} L${W} ${H} L0 ${H} Z`;

  // An empty chart rounds every tick to 0, so duplicates are dropped.
  const ticks = axis ? [...new Set([0, 0.5, 1].map((t) => Math.round(max * t)))] : [];
  const last = points[points.length - 1];
  const active = hover ?? data.length - 1;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, i)));
  };

  return (
    <div className={cn("flex min-h-0 w-full", className)}>
      {axis && (
        <div className="relative mr-2 w-8 shrink-0 text-right text-[0.6875rem] text-fg-3 tabular-nums" aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(y(t) / H) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      )}
      <div
        role="img"
        aria-label={`${label}. Latest value ${format(data[data.length - 1])}.`}
        className="relative min-w-0 flex-1 touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <motion.div {...reveal} key={data.join()} className="absolute inset-0">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="size-full overflow-visible">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity="0.38" />
                <stop offset="1" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {axis &&
              ticks.map((t) => (
                <line key={t} x1="0" x2={W} y1={y(t)} y2={y(t)} stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              ))}
            <path d={area} fill={`url(#${gradient})`} />
            <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          </svg>
        </motion.div>

        {hover === null && (
          <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(last[0] / W) * 100}%`, top: `${(last[1] / H) * 100}%` }}>
            <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: color }} />
            <span className="absolute inset-0 rounded-full ring-2 ring-surface" style={{ background: color }} />
          </span>
        )}

        {hover !== null && (
          <>
            <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/25" style={{ left: `${(points[active][0] / W) * 100}%` }} />
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
              style={{ left: `${(points[active][0] / W) * 100}%`, top: `${(points[active][1] / H) * 100}%`, background: color }}
            />
            <span
              className="pointer-events-none absolute z-10 -translate-y-full rounded-md border border-line bg-[#1c1138] px-2 py-1 text-[0.6875rem] whitespace-nowrap shadow-lg"
              style={{
                left: `${(points[active][0] / W) * 100}%`,
                top: `${(points[active][1] / H) * 100}%`,
                transform: `translate(${active > data.length / 2 ? "calc(-100% - 8px)" : "8px"}, calc(-100% - 6px))`,
              }}
            >
              <span className="text-fg-3">{labels?.[active]}</span> <span className="font-semibold text-fg tabular-nums">{format(data[active])}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function Legend({ areas = AREAS }: { areas?: LifeArea[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2">
      {areas.map((a) => (
        <li key={a} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: AREA_COLORS[a] }} />
          {a}
        </li>
      ))}
    </ul>
  );
}

/** Hours per day, stacked by life area. */
export function StackedBars({ rows }: { rows: { day: string; values: Record<LifeArea, number> }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const totals = rows.map((r) => AREAS.reduce((sum, a) => sum + r.values[a], 0));
  const max = Math.max(4, Math.ceil(Math.max(...totals) / 4) * 4);
  const ticks = [0, max / 2, max];

  return (
    <div className="flex h-56 gap-2">
      <div className="relative w-6 shrink-0 text-right text-[0.6875rem] text-fg-3 tabular-nums" aria-hidden>
        {ticks.map((t) => (
          <span key={t} className="absolute right-0 translate-y-1/2" style={{ bottom: `calc(1.25rem + ${(t / max) * 100}% - ${(t / max) * 1.25}rem)` }}>
            {t}
          </span>
        ))}
      </div>
      <div className="relative flex min-w-0 flex-1 items-end justify-around gap-1">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute right-0 left-0 h-px bg-white/7"
            style={{ bottom: `calc(1.25rem + ${(t / max) * 100}% - ${(t / max) * 1.25}rem)` }}
          />
        ))}
        {rows.map((r, i) => (
          <div
            key={r.day}
            tabIndex={0}
            onPointerEnter={() => setHover(r.day)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(r.day)}
            onBlur={() => setHover(null)}
            className="relative flex h-full flex-1 flex-col items-center justify-end outline-none"
          >
            <motion.div
              className="flex w-full max-w-6 origin-bottom flex-col-reverse gap-0.5 overflow-hidden rounded-t"
              style={{ height: `calc((100% - 1.25rem) * ${totals[i] / max})` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: "easeOut" }}
            >
              {AREAS.map((a) => (
                <div key={a} style={{ flex: r.values[a], background: AREA_COLORS[a], opacity: hover && hover !== r.day ? 0.45 : 1 }} className="transition-opacity" />
              ))}
            </motion.div>
            <span className="mt-1 h-4 text-[0.6875rem] text-fg-3">{r.day}</span>
            {hover === r.day && (
              <div className="pointer-events-none absolute top-0 left-1/2 z-10 w-32 -translate-x-1/2 rounded-md border border-line bg-[#1c1138] px-2 py-1.5 text-[0.6875rem] shadow-lg">
                <div className="mb-0.5 font-semibold">
                  {r.day} · {totals[i]} hrs
                </div>
                {AREAS.map((a) => (
                  <div key={a} className="flex items-center gap-1.5 text-fg-2">
                    <span className="size-2 rounded-sm" style={{ background: AREA_COLORS[a] }} />
                    <span className="flex-1">{a}</span>
                    <span className="text-fg tabular-nums">{r.values[a]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const HEAT = ["rgb(255 255 255 / 0.05)", "#3a2474", "#5634ad", "#7a4be0", "#a78bfa"];

/** Sequential single-hue calendar of how many habits were completed each day. */
export function Heatmap({ weeks }: { weeks: number[][] }) {
  return (
    <div>
      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1 pt-px text-[0.625rem] leading-4 text-fg-3">
          {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
            <span key={i} className="h-4">
              {d}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 gap-1">
          {weeks.map((week, w) => (
            <div key={w} className="flex flex-1 flex-col gap-1">
              {week.map((v, d) => (
                <motion.span
                  key={d}
                  title={`Week ${w + 1}, ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d]}: ${v} ${v === 1 ? "routine" : "routines"}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: w * 0.02 + d * 0.01 }}
                  className="h-4 rounded-[3px]"
                  style={{ background: HEAT[v] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[0.6875rem] text-fg-3">
        Less
        {HEAT.map((c) => (
          <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} />
        ))}
        More
      </div>
    </div>
  );
}
