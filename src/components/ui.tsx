"use client";

import { animate, AnimatePresence, motion } from "motion/react";
import { Check, CircleAlert, Info, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const spotlight = (e: PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

export const enter = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
});

type BadgeTone = "pink" | "violet" | "blue";

const BADGES: Record<BadgeTone, string> = {
  pink: "from-[#ff5cc0] to-[#c026d3] shadow-[0_0_0.8rem_rgb(236_75_184_/_0.55)]",
  violet: "from-[#b98bff] to-[#7c3aed] shadow-[0_0_0.8rem_rgb(139_92_246_/_0.55)]",
  blue: "from-[#6c9bff] to-[#3b5bdb] shadow-[0_0_0.8rem_rgb(79_124_255_/_0.55)]",
};

export function NumBadge({ n, tone = "pink" }: { n: number; tone?: BadgeTone }) {
  return (
    <span className={cn("mt-px grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-b text-xs font-bold text-white", BADGES[tone])}>{n}</span>
  );
}

export function Card({
  n,
  tone = "pink",
  title,
  subtitle,
  right,
  className,
  bodyClass,
  delay = 0,
  id,
  children,
}: {
  n?: number;
  tone?: BadgeTone;
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  bodyClass?: string;
  delay?: number;
  id?: string;
  children?: ReactNode;
}) {
  return (
    <motion.section {...enter(delay)} id={id} onPointerMove={spotlight} className={cn("nx-card flex flex-col", className)}>
      {(title || n) && (
        <header className="flex items-start gap-2.5 px-3.5 pt-3">
          {n && <NumBadge n={n} tone={tone} />}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base leading-6 font-semibold text-fg">{title}</h2>
            {subtitle && <div className="-mt-0.5 text-[0.6875rem] text-fg-3">{subtitle}</div>}
          </div>
          {right}
        </header>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col px-3.5 pt-2 pb-3", bodyClass)}>{children}</div>
    </motion.section>
  );
}

type BtnTone = "violet" | "rose" | "blue" | "ghost" | "green";

export function Btn({
  tone = "violet",
  className,
  size = "md",
  ...props
}: ComponentProps<"button"> & { tone?: BtnTone; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      data-tone={tone}
      className={cn("nx-btn", size === "md" ? "h-8.5 px-5 text-[0.8125rem]" : "h-7 px-3 text-xs", className)}
      {...props}
    />
  );
}

export function LinkBtn({
  tone = "violet",
  className,
  ...props
}: ComponentProps<typeof Link> & { tone?: BtnTone }) {
  return <Link data-tone={tone} className={cn("nx-btn h-8.5 px-5 text-[0.8125rem]", className)} {...props} />;
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative flex h-5.5 w-10 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors",
        on ? "justify-end border-nx-lilac/60 bg-nx-violet/70" : "justify-start border-line bg-white/5",
      )}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 520, damping: 34 }} className="size-4 rounded-full bg-white shadow" />
    </button>
  );
}

export function Check3({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "grid size-4.5 shrink-0 cursor-pointer place-items-center rounded-full border transition-all",
        on ? "border-nx-pink bg-gradient-to-b from-[#ff6ccb] to-[#c026d3] shadow-[0_0_0.6rem_rgb(236_75_184_/_0.6)]" : "border-fg-3/70 hover:border-nx-lilac",
      )}
    >
      <AnimatePresence>
        {on && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
            <Check className="size-3 text-white" strokeWidth={3.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#05020d]/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn("nx-card w-full max-w-lg bg-[#150b30] p-5", className)}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 grid size-7 cursor-pointer place-items-center rounded-full text-fg-3 hover:bg-white/10 hover:text-fg"
            >
              <X className="size-4" />
            </button>
            {title && <h2 className="pr-8 text-lg font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 pr-8 text-sm text-fg-3">{subtitle}</p>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function CountUp({ to, format }: { to: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.3,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [to, format]);
  return <span ref={ref}>{format(to)}</span>;
}

export function Ring({
  value,
  size = "3rem",
  stroke = 8,
  color = "url(#nx-ring)",
  children,
}: {
  value: number;
  size?: string;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="nx-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5cc0" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={50 - stroke / 2} fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth={stroke} />
        <motion.circle
          cx="50"
          cy="50"
          r={50 - stroke / 2}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

export function Bar({ value, tone = "violet", className }: { value: number; tone?: "violet" | "pink"; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-white/10", className)}
    >
      <motion.div
        className={cn("h-full rounded-full", tone === "violet" ? "bg-gradient-to-r from-[#a06bff] to-[#7c3aed]" : "bg-gradient-to-r from-[#ff6ccb] to-[#a855f7]")}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}

export function Page({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[110rem] pb-6">
      <motion.header {...enter()} className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-0.5 text-sm text-fg-2">{subtitle}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </motion.header>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
  delay = 0,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  delay?: number;
}) {
  return (
    <motion.div {...enter(delay)} onPointerMove={spotlight} className="nx-card px-4 py-3">
      <div className="text-xs text-fg-3">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold">{value}</div>
      {note && <div className="mt-0.5 text-xs text-fg-2">{note}</div>}
    </motion.div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.6875rem] whitespace-nowrap", className)}>
      {children}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-full border border-line bg-white/4 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("relative cursor-pointer rounded-full px-3 py-1 text-xs transition-colors", value === o.value ? "text-white" : "text-fg-3 hover:text-fg")}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-gradient-to-b from-[#6a35e0] to-[#431aa8]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toaster() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  const icons = { good: Check, info: Info, warn: CircleAlert };
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <motion.button
              layout
              type="button"
              key={t.id}
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              className="nx-card pointer-events-auto flex cursor-pointer items-center gap-2.5 bg-[#1a0e3a] px-3.5 py-2.5 text-left text-sm"
            >
              <Icon className="size-4 shrink-0 text-nx-lilac" />
              <span className="min-w-0">{t.text}</span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
