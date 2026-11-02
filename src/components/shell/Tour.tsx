"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/components/Mascot";
import { Btn } from "@/components/ui";
import { useStore } from "@/lib/store";

const STEPS: { target?: string; title: string; text: string }[] = [
  { title: "Hi, I'm Nexus!", text: "Your personal AI operating system. Let me show you around. It only takes a moment." },
  { target: "tour-companion", title: "Talk to me here", text: "Ask about your day, or tell me to add tasks, save memories and hand work to your agents." },
  { target: "tour-actions", title: "You stay in control", text: "Agents prepare the work, and nothing sensitive happens until you approve it here." },
  { target: "tour-agents", title: "Meet your agent team", text: "Ten specialists ready to research, plan, write and automate. Pick one to launch it." },
  { target: "tour-goals", title: "Turn goals into plans", text: "Tell me what you want to achieve, and I'll break it into steps you can schedule." },
  { target: "tour-search", title: "Find anything fast", text: "Press ⌘K to jump to any page, agent, goal or memory. That's it, enjoy!" },
];

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const GAP = 14;
const EDGE = 12;
const SPOTLIGHT_PAD = 6;

type Box = { left: number; top: number; width: number; height: number };

function placeCard(box: Box | null, vw: number, vh: number) {
  const width = Math.min(CARD_WIDTH, vw - EDGE * 2);
  const fit = (left: number, top: number) => ({
    width,
    left: Math.min(vw - width - EDGE, Math.max(EDGE, left)),
    top: Math.min(vh - CARD_HEIGHT - EDGE, Math.max(EDGE, top)),
  });
  if (!box) return fit((vw - width) / 2, (vh - CARD_HEIGHT) / 2);

  const right = box.left + box.width + GAP;
  const left = box.left - GAP - width;
  if (vw >= 768 && right + width + EDGE <= vw) return fit(right, box.top);
  if (vw >= 768 && left >= EDGE) return fit(left, box.top);

  const below = box.top + box.height + GAP;
  return below + CARD_HEIGHT + EDGE <= vh ? fit(box.left, below) : fit(box.left, box.top - GAP - CARD_HEIGHT);
}

export function Tour() {
  const pathname = usePathname();
  const tourDone = useStore((s) => s.tourDone);
  const setTourDone = useStore((s) => s.setTourDone);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const nextRef = useRef<HTMLButtonElement>(null);

  const current = STEPS[step];

  // Waits for the dashboard's entrance animation, so the spotlight lands where cards settle.
  useEffect(() => {
    if (tourDone || pathname !== "/") {
      setOpen(false);
      return;
    }
    setStep(0);
    const t = setTimeout(() => setOpen(true), 1100);
    return () => clearTimeout(t);
  }, [tourDone, pathname]);

  const measure = useCallback(() => {
    setViewport({ width: window.innerWidth, height: window.innerHeight });
    const el = current.target ? document.getElementById(current.target) : null;
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ left: r.left - SPOTLIGHT_PAD, top: r.top - SPOTLIGHT_PAD, width: r.width + SPOTLIGHT_PAD * 2, height: r.height + SPOTLIGHT_PAD * 2 });
  }, [current]);

  useLayoutEffect(() => {
    if (!open) return;
    if (current.target) document.getElementById(current.target)?.scrollIntoView({ block: "center" });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, current, measure]);

  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open, step]);

  const finish = useCallback(() => {
    setOpen(false);
    setTourDone(true);
  }, [setTourDone]);

  const last = step === STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && !last) setStep((s) => s + 1);
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last, finish]);

  const card = placeCard(box, viewport.width, viewport.height);

  return createPortal(
    <AnimatePresence>
      {open && viewport.width > 0 && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {box ? (
            <motion.div
              className="pointer-events-none absolute rounded-2xl border border-nx-lilac shadow-[0_0_0_200vmax_rgb(5_2_13_/_0.74)]"
              initial={false}
              animate={box}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
            />
          ) : (
            <div className="absolute inset-0 bg-[#05020d]/74" />
          )}

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Welcome tour"
            className="nx-card nx-solid absolute p-4 !overflow-visible"
            initial={false}
            animate={card}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="flex items-start gap-3">
              <Mascot variant="head" className="w-12 shrink-0 animate-float-sm" />
              <div className="min-w-0">
                <h2 className="text-[0.9375rem] leading-5 font-semibold">{current.title}</h2>
                <p className="mt-1 text-[0.8125rem] leading-5 text-fg-2">{current.text}</p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2">
              <span className="flex flex-1 gap-1" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
                {STEPS.map((s, i) => (
                  <span key={s.title} className={i === step ? "h-1.5 w-4 rounded-full bg-nx-pink" : "size-1.5 rounded-full bg-white/20"} />
                ))}
              </span>
              {!last && (
                <button type="button" onClick={finish} className="cursor-pointer px-1 text-xs text-fg-3 hover:text-fg">
                  Skip
                </button>
              )}
              {step > 0 && (
                <Btn size="sm" tone="ghost" onClick={() => setStep(step - 1)}>
                  Back
                </Btn>
              )}
              <Btn ref={nextRef} size="sm" onClick={() => (last ? finish() : setStep(step + 1))}>
                {last ? "Get started" : step === 0 ? "Show me" : "Next"}
              </Btn>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
