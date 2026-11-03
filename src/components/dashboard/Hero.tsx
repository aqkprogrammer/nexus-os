"use client";

import { motion } from "motion/react";
import { CalendarDays, Clock, Heart, Home, Star, Sun, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Galaxy } from "@/components/Galaxy";
import { Mascot } from "@/components/Mascot";
import { enter } from "@/components/ui";
import { useStore } from "@/lib/store";
import { greeting } from "@/lib/utils";

// Measured from the top of the mascot, so the arc clears its head and halo.
const ORBS = [
  { icon: Star, x: "-7.2rem", y: "2.5rem", color: "#fbb024", size: "1.45rem", delay: 0.3 },
  { icon: Heart, x: "-5.4rem", y: "0.4rem", color: "#ff5cc0", size: "1.7rem", delay: 0.8 },
  { icon: Zap, x: "0rem", y: "-2rem", color: "#c084fc", size: "1.6rem", delay: 0 },
  { icon: Home, x: "5.4rem", y: "0.4rem", color: "#60a5fa", size: "1.7rem", delay: 1.2 },
  { icon: Star, x: "7.2rem", y: "2.5rem", color: "#fbb024", size: "1.45rem", delay: 0.6 },
];

export function Hero() {
  const name = useStore((s) => s.profile.name);
  const sample = useStore((s) => s.sample);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.section {...enter()} className="relative h-[13rem] overflow-visible rounded-2xl max-md:h-[20rem]">
      <div
        className="nx-hero-bg absolute inset-0 overflow-hidden rounded-2xl"
        style={{
          background:
            "radial-gradient(11rem 8rem at 67.5% 62%, rgb(214 120 255 / 0.62), transparent 72%), radial-gradient(30rem 11rem at 66% 62%, rgb(132 50 235 / 0.68), transparent 72%), radial-gradient(22rem 9rem at 92% 22%, rgb(236 75 184 / 0.3), transparent 72%), radial-gradient(26rem 8rem at 42% 104%, rgb(70 60 235 / 0.4), transparent 72%)",
        }}
      >
        <Galaxy />
      </div>

      <div className="relative max-w-[32rem] pt-3 pl-3.5 max-md:pr-3.5">
        <h1 className="flex items-center gap-3 text-[2.05rem] leading-tight font-bold tracking-tight max-md:text-2xl">
          {now ? greeting(now.getHours()) : "Welcome back"}, {name}
          <span className="inline-block origin-[70%_70%] animate-wave" aria-hidden>
            👋
          </span>
        </h1>
        <p className="mt-1 text-[0.9375rem] text-fg-2">Here&apos;s what Nexus prepared for you today.</p>
        <div className="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-line bg-white/3 px-3.5 py-2 text-[0.8125rem] text-fg-2 backdrop-blur-sm">
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" strokeWidth={1.7} />
            <span suppressHydrationWarning>{now ? now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Today"}</span>
          </span>
          {/* There's no weather source yet, so only the sample shows a temperature. */}
          {sample && (
            <span className="flex items-center gap-2">
              <Sun className="size-4 animate-spin-slow text-nx-amber" />
              72°F
            </span>
          )}
          <span className="flex items-center gap-2">
            <Clock className="size-4" strokeWidth={1.7} />
            <span suppressHydrationWarning>{now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "--:--"}</span>
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-[67.5%] -translate-x-1/2 max-md:left-[72%]">
        <div className="relative animate-float">
          {ORBS.map((o, i) => (
            <span key={i} className="absolute top-0 left-1/2 max-md:hidden" style={{ transform: `translate(calc(-50% + ${o.x}), ${o.y})` }}>
              <motion.span
                className="block"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: o.delay }}
              >
                <o.icon
                  style={{ width: o.size, height: o.size, color: o.color, fill: o.color, filter: `drop-shadow(0 0 0.5rem ${o.color})` }}
                  strokeWidth={1.4}
                />
              </motion.span>
            </span>
          ))}
          <Mascot track className="h-[10.5rem] w-auto max-md:h-[9rem]" />
        </div>
      </div>
    </motion.section>
  );
}
