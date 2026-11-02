"use client";

import { AnimatePresence, motion } from "motion/react";
import { Brain, CornerDownLeft, Rocket, Search, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AGENTS, NAV } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setUi = useStore((s) => s.setUi);
  const memories = useStore((s) => s.memories);
  const goals = useStore((s) => s.goals);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const rows = useMemo(() => {
    const go = (href: string) => () => router.push(href);
    const all: Row[] = [
      ...NAV.map((n) => ({ id: n.href, group: "Go to", label: n.label, icon: n.icon, run: go(n.href) })),
      ...AGENTS.map((a) => ({
        id: a.id,
        group: "Agents",
        label: `Launch ${a.name}`,
        hint: a.desc,
        icon: Rocket,
        run: () => setUi({ launch: { open: true, agent: a.id } }),
      })),
      ...goals.map((g) => ({
        id: g.id,
        group: "Goals",
        label: g.title,
        hint: g.status,
        icon: Target,
        run: () => {
          setUi({ selectedGoal: g.id });
          router.push("/goals");
        },
      })),
      ...memories.map((m) => ({ id: m.id, group: "Memories", label: m.title, hint: m.area, icon: Brain, run: go("/brain") })),
    ];
    const term = q.trim().toLowerCase();
    if (!term) return all.filter((r) => r.group === "Go to");
    return all.filter((r) => `${r.label} ${r.hint ?? ""}`.toLowerCase().includes(term)).slice(0, 12);
  }, [q, goals, memories, router, setUi]);

  const close = () => setUi({ paletteOpen: false });
  const choose = (r?: Row) => {
    if (!r) return;
    close();
    r.run();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (e.key === "Enter") choose(rows[cursor]);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#05020d]/70 p-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-label="Search"
            initial={{ y: -14, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="nx-card nx-solid w-full max-w-xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-5 text-fg-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setCursor(0);
                }}
                onKeyDown={onKey}
                placeholder="Search pages, agents, goals, memories..."
                className="h-13 w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-fg-3"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 font-sans text-[0.6875rem] text-fg-3">esc</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {rows.map((r, i) => (
                <li key={`${r.group}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    onPointerEnter={() => setCursor(i)}
                    className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm", i === cursor ? "bg-nx-violet/25 text-white" : "text-fg-2")}
                  >
                    <r.icon className="size-4.5 shrink-0" strokeWidth={1.7} />
                    <span className="min-w-0 truncate">{r.label}</span>
                    {r.hint && <span className="truncate text-xs text-fg-3">{r.hint}</span>}
                    <span className="ml-auto text-[0.6875rem] whitespace-nowrap text-fg-3">{r.group}</span>
                    {i === cursor && <CornerDownLeft className="size-3.5 shrink-0 text-fg-3" />}
                  </button>
                </li>
              ))}
              {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-fg-3">No matches for &ldquo;{q}&rdquo;</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
