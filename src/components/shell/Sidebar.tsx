"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Crown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Bar } from "@/components/ui";
import { NAV } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const pending = useStore((s) => s.actions.length);
  const memories = useStore((s) => s.memories.length);
  const [open, setOpen] = useState<string | null>(null);

  const usedGb = Math.min(100, 57 + memories);

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-r border-line/60 px-3.5 pt-3 pb-3.5">
      <Link href="/" onClick={onNavigate} className="mb-5 flex items-center gap-2.5 px-1" aria-label="NEXUS OS home">
        <Mascot variant="head" className="w-12 shrink-0" title="Nexus OS logo" />
        <span className="min-w-0">
          <span className="nx-wordmark block text-2xl leading-7 font-bold tracking-tight">
            <i className="pr-1 font-medium">Nexus</i>OS
          </span>
          <span className="block truncate text-[0.6875rem] text-fg-2">Your AI Operating System.</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const expanded = open === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <div className="relative">
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      className="absolute inset-0 rounded-xl border border-[#8a5cf6] bg-gradient-to-r from-[#5a2bd0] to-[#2f1479] shadow-[0_0_1.1rem_rgb(124_77_255_/_0.5)]"
                    />
                  )}
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-12 items-center gap-3 rounded-xl px-3.5 text-[0.9375rem] transition-colors",
                      active ? "text-white" : "text-fg-2 hover:bg-white/5 hover:text-fg",
                    )}
                  >
                    <Icon className={cn("size-5.5 shrink-0 transition-transform group-hover:scale-110", active && "text-nx-lilac")} strokeWidth={1.7} />
                    <span className="truncate">{item.label}</span>
                    {item.label === "Actions" && pending > 0 && (
                      <motion.span
                        key={pending}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                        className="ml-auto grid h-6 min-w-6 place-items-center rounded-md bg-[#7a1a55] px-1.5 text-xs font-semibold text-[#ffb4e0]"
                      >
                        {pending}
                      </motion.span>
                    )}
                  </Link>
                  {item.children && (
                    <button
                      type="button"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : item.href)}
                      className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-md text-fg-3 hover:text-fg"
                    >
                      <ChevronRight className={cn("size-4 transition-transform", expanded && "rotate-90")} />
                    </button>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {expanded && item.children && (
                    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <Link href={c.href} onClick={onNavigate} className="ml-11 block rounded-md px-2 py-1.5 text-[0.8125rem] text-fg-3 hover:text-fg">
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 space-y-3">
        <div className="nx-card p-3">
          <div className="flex items-center gap-3 px-1">
            <Crown className="size-7 animate-float-sm fill-nx-amber/30 text-nx-amber" strokeWidth={1.5} />
            <div className="text-[0.8125rem] leading-5">
              <div className="text-fg-3">Plan</div>
              <div className="text-fg">Nexus Pro</div>
            </div>
          </div>
          <Link href="/settings#plan" onClick={onNavigate} className="nx-btn mt-2.5 h-8 w-full text-[0.8125rem]" data-tone="ghost">
            Manage Plan
          </Link>
        </div>
        <div className="nx-card px-4 py-3">
          <div className="flex justify-between text-xs text-fg-2">
            <span>AI Memory</span>
            <span>{usedGb}%</span>
          </div>
          <Bar value={usedGb} className="mt-2.5" />
          <div className="mt-2.5 text-[0.6875rem] text-fg-3">{usedGb} GB of 100 GB used</div>
        </div>
      </div>
    </aside>
  );
}
