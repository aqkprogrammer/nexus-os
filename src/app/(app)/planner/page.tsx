"use client";

import { AnimatePresence, motion } from "motion/react";
import { Flame, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Legend } from "@/components/charts";
import { Bar, Btn, Card, Check3, Modal, Page } from "@/components/ui";
import { AREA_COLORS, AREAS, DAYS, type CalEvent, type LifeArea } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, weekdayIndex } from "@/lib/utils";

const FIRST_HOUR = 7;
const LAST_HOUR = 21;
const HOUR_REM = 2.5;

const fmt = (h: number) => {
  const hour = Math.floor(h);
  const mins = Math.round((h - hour) * 60);
  return `${hour % 12 || 12}${mins ? `:${String(mins).padStart(2, "0")}` : ""}${hour >= 12 ? "pm" : "am"}`;
};

function WeekGrid({ onSlot, onOpen }: { onSlot: (day: number, hour: number) => void; onOpen: (e: CalEvent) => void }) {
  const events = useStore((s) => s.events);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const today = now ? weekdayIndex(now) : -1;
  const nowHour = now ? now.getHours() + now.getMinutes() / 60 : 0;
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[44rem]">
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] border-b border-line pb-1.5 text-center text-xs text-fg-2">
          <span />
          {DAYS.map((d, i) => (
            <span key={d} className={cn(i === today && "font-semibold text-nx-lilac")}>
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]">
          <div>
            {hours.map((h) => (
              <div key={h} className="pr-2 text-right text-[0.6875rem] text-fg-3" style={{ height: `${HOUR_REM}rem` }}>
                {fmt(h)}
              </div>
            ))}
          </div>
          {DAYS.map((d, day) => (
            <div key={d} className={cn("relative border-l border-white/5", day === today && "bg-nx-violet/7")}>
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`Add event ${d} at ${fmt(h)}`}
                  onClick={() => onSlot(day, h)}
                  className="block w-full cursor-pointer border-b border-white/5 hover:bg-white/4"
                  style={{ height: `${HOUR_REM}rem` }}
                />
              ))}
              {events
                .filter((e) => e.day === day)
                .map((e, i) => (
                  <motion.button
                    key={e.id}
                    type="button"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 + day * 0.02 }}
                    whileHover={{ scale: 1.03 }}
                    onClick={() => onOpen(e)}
                    className="absolute inset-x-0.5 cursor-pointer overflow-hidden rounded-md border-l-[3px] px-1.5 py-0.5 text-left text-[0.6875rem] leading-tight text-fg"
                    style={{
                      top: `${(e.start - FIRST_HOUR) * HOUR_REM}rem`,
                      height: `${e.duration * HOUR_REM - 0.1}rem`,
                      background: `${AREA_COLORS[e.area]}40`,
                      borderColor: AREA_COLORS[e.area],
                    }}
                  >
                    <span className="block truncate font-medium">{e.title}</span>
                    {e.duration >= 1 && <span className="block truncate text-fg-2">{fmt(e.start)}</span>}
                  </motion.button>
                ))}
              {day === today && nowHour >= FIRST_HOUR && nowHour <= LAST_HOUR && (
                <span className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-nx-pink shadow-[0_0_0.5rem_#ec4bb8]" style={{ top: `${(nowHour - FIRST_HOUR) * HOUR_REM}rem` }}>
                  <span className="absolute -top-1 -left-1 size-2.5 animate-pulse rounded-full bg-nx-pink" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  const priorities = useStore((s) => s.priorities);
  const togglePriority = useStore((s) => s.togglePriority);
  const addPriority = useStore((s) => s.addPriority);
  const removePriority = useStore((s) => s.removePriority);
  const habits = useStore((s) => s.habits);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const addEvent = useStore((s) => s.addEvent);
  const removeEvent = useStore((s) => s.removeEvent);
  const toast = useStore((s) => s.toast);

  const [task, setTask] = useState("");
  const [slot, setSlot] = useState<{ day: number; start: number } | null>(null);
  const [draft, setDraft] = useState({ title: "", duration: 1, area: "Work" as LifeArea });
  const [opened, setOpened] = useState<CalEvent | null>(null);
  const [today, setToday] = useState(-1);
  useEffect(() => setToday(weekdayIndex()), []);

  const done = priorities.filter((p) => p.done).length;
  const pct = priorities.length ? Math.round((done / priorities.length) * 100) : 0;

  return (
    <Page
      title="Life Planner"
      subtitle="Goals, routines and schedules in one view."
      actions={
        <Btn tone="rose" onClick={() => setSlot({ day: Math.max(0, today), start: 9 })}>
          <Plus className="size-4" /> New event
        </Btn>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <div className="space-y-3">
          <Card id="today" title="Today" subtitle={`${done} of ${priorities.length} done`} className="scroll-mt-4">
            <Bar value={pct} tone="pink" className="mb-2.5" />
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {priorities.map((p) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="group flex items-center gap-2.5 rounded-lg px-1 py-1.5 hover:bg-white/4">
                    <Check3 on={p.done} onChange={() => togglePriority(p.id)} label={p.title} />
                    <span className={cn("min-w-0 flex-1 truncate text-sm", p.done ? "text-fg-3 line-through" : "text-fg")}>{p.title}</span>
                    <button type="button" aria-label={`Remove ${p.title}`} onClick={() => removePriority(p.id)} className="cursor-pointer text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-nx-rose focus:opacity-100">
                      <X className="size-4" />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!task.trim()) return;
                addPriority(task.trim());
                setTask("");
              }}
            >
              <input aria-label="New task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task" className="nx-input" />
              <Btn type="submit" aria-label="Add task" className="!px-3" disabled={!task.trim()}>
                <Plus className="size-4" />
              </Btn>
            </form>
          </Card>

          <Card id="routines" title="Routines" subtitle="Tap a day to log it." delay={0.08} className="scroll-mt-4">
            <div className="mb-1 grid grid-cols-[minmax(0,1fr)_repeat(7,1.35rem)_2.4rem] items-center gap-1 text-center text-[0.625rem] text-fg-3">
              <span />
              {DAYS.map((d) => (
                <span key={d}>{d[0]}</span>
              ))}
              <span />
            </div>
            <ul className="space-y-1.5">
              {habits.map((h) => (
                <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_repeat(7,1.35rem)_2.4rem] items-center gap-1">
                  <span className="truncate text-[0.8125rem] text-fg">{h.title}</span>
                  {h.week.map((on, d) => (
                    <motion.button
                      key={d}
                      type="button"
                      whileTap={{ scale: 0.8 }}
                      aria-label={`${h.title}, ${DAYS[d]}`}
                      aria-pressed={on}
                      onClick={() => toggleHabit(h.id, d)}
                      className={cn("size-[1.35rem] cursor-pointer rounded-md border transition-colors", on ? "border-nx-pink bg-gradient-to-b from-[#ff6ccb] to-[#a855f7]" : "border-line bg-white/4 hover:border-nx-lilac", d === today && !on && "border-nx-lilac/60")}
                    />
                  ))}
                  <span className="flex items-center justify-end gap-0.5 text-xs text-fg-2 tabular-nums">
                    <Flame className="size-3.5 text-nx-amber" />
                    {h.streak}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card id="week" title="This Week" subtitle="Click any empty slot to add an event." delay={0.14} className="scroll-mt-4" right={<div className="hidden md:block"><Legend /></div>}>
          <WeekGrid
            onSlot={(day, start) => setSlot({ day, start })}
            onOpen={setOpened}
          />
        </Card>
      </div>

      <Modal open={!!slot} onClose={() => setSlot(null)} title="New event" subtitle={slot ? `${DAYS[slot.day]} at ${fmt(slot.start)}` : undefined}>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!slot || !draft.title.trim()) return;
            addEvent({ ...slot, ...draft, title: draft.title.trim() });
            setDraft({ title: "", duration: 1, area: "Work" });
            setSlot(null);
            toast("Added to your week");
          }}
        >
          <label className="block text-xs text-fg-2">
            Title
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="nx-input mt-1.5" placeholder="Deep work" />
          </label>
          {slot && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs text-fg-2">
                Day
                <select value={slot.day} onChange={(e) => setSlot({ ...slot, day: Number(e.target.value) })} className="nx-input mt-1.5">
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-fg-2">
                Start
                <select value={slot.start} onChange={(e) => setSlot({ ...slot, start: Number(e.target.value) })} className="nx-input mt-1.5">
                  {Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i).map((h) => (
                    <option key={h} value={h}>
                      {fmt(h)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-fg-2">
              Duration
              <select value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) })} className="nx-input mt-1.5">
                {[0.5, 1, 1.5, 2, 3].map((d) => (
                  <option key={d} value={d}>
                    {d} hr
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-fg-2">
              Life area
              <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as LifeArea })} className="nx-input mt-1.5">
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={!draft.title.trim()}>
              Add event
            </Btn>
          </div>
        </form>
      </Modal>

      <Modal open={!!opened} onClose={() => setOpened(null)} title={opened?.title} subtitle={opened ? `${DAYS[opened.day]}, ${fmt(opened.start)} to ${fmt(opened.start + opened.duration)} · ${opened.area}` : undefined}>
        <div className="mt-5 flex justify-end">
          <Btn
            tone="rose"
            onClick={() => {
              if (opened) removeEvent(opened.id);
              setOpened(null);
              toast("Event removed", "info");
            }}
          >
            <Trash2 className="size-4" /> Remove event
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
