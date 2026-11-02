"use client";

import { motion } from "motion/react";
import { ArrowRight, Clock, Plus, Rocket, Star, Trash2, UserRoundCheck, UsersRound, Lock, Monitor, Smartphone, Tablet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Btn, Card, NumBadge } from "@/components/ui";
import { AGENTS, MEMORY_ICONS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, dayLabel, timeAgo } from "@/lib/utils";

export function MemoryTimeline() {
  const memories = useStore((s) => s.memories);
  return (
    <Card n={5} title="Memory Timeline" delay={0.3}>
      <p className="text-xs text-fg-2">Recent memories</p>
      <ol className="relative mt-1.5 flex-1 space-y-1.5">
        <span className="absolute top-1.5 bottom-1.5 left-[0.3rem] w-px bg-gradient-to-b from-nx-pink to-nx-violet/30" aria-hidden />
        {memories.slice(0, 4).map((m, i) => {
          const { icon: Icon, color } = MEMORY_ICONS[m.type];
          return (
            <motion.li key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.07 }} className="relative flex items-center gap-2 text-xs">
              <span className={cn("relative z-10 size-2.5 shrink-0 rounded-full border-2 border-nx-pink bg-[#1a0e3a]", i === 0 && "shadow-[0_0_0.5rem_#ec4bb8]")} />
              <span className="w-[3.3rem] shrink-0 truncate text-[0.625rem] text-fg-3" suppressHydrationWarning>
                {m.daysAgo === 0 ? m.time : dayLabel(m.daysAgo)}
              </span>
              <Icon className="size-3.5 shrink-0" style={{ color }} strokeWidth={1.8} />
              <span className="min-w-0 truncate text-fg">{m.title}</span>
            </motion.li>
          );
        })}
      </ol>
      <div className="pt-2">
        <Link href="/brain" className="nx-btn h-8 w-full text-[0.8125rem]">
          Open Memory
        </Link>
      </div>
    </Card>
  );
}

export function AgentTeam() {
  const setUi = useStore((s) => s.setUi);
  const runs = useStore((s) => s.runs);
  const busy = new Set(runs.filter((r) => r.status === "running").map((r) => r.agent));

  return (
    <Card
      n={6}
      title={
        <span className="flex items-baseline gap-3">
          Agent Team <span className="hidden truncate text-[0.6875rem] font-normal text-fg-2 sm:inline">Your personal AI team, working for you.</span>
        </span>
      }
      delay={0.36}
      className="dash-wide"
    >
      <ul className="grid flex-1 grid-cols-5 gap-1.5 max-md:grid-cols-2">
        {AGENTS.map((a, i) => (
          <motion.li key={a.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.42 + i * 0.03 }}>
            <button
              type="button"
              onClick={() => setUi({ launch: { open: true, agent: a.id } })}
              className="nx-tile group relative flex h-full w-full cursor-pointer items-center gap-1.5 px-1.5 py-1.5 text-left hover:-translate-y-0.5"
            >
              <a.icon
                className="size-5.5 shrink-0 transition-transform group-hover:scale-115"
                style={{ color: a.color, fill: `${a.color}2e`, filter: `drop-shadow(0 0 0.3rem ${a.color}80)` }}
                strokeWidth={1.6}
              />
              <span className="min-w-0">
                <span className="block truncate text-xs leading-4 text-fg">{a.name}</span>
                <span className="block truncate text-[0.53rem] text-fg-3">{a.desc}</span>
              </span>
              {busy.has(a.id) && <span className="absolute top-1 right-1 size-2 animate-ping rounded-full bg-nx-green" />}
            </button>
          </motion.li>
        ))}
      </ul>
      <div className="flex justify-center pt-2.5">
        <Btn className="min-w-[19rem] max-sm:w-full" onClick={() => setUi({ launch: { open: true } })}>
          <Rocket className="size-4" /> Launch an Agent
        </Btn>
      </div>
    </Card>
  );
}

export function IdeaVault() {
  const ideas = useStore((s) => s.ideas);
  const toggle = useStore((s) => s.toggleIdea);
  const promote = useStore((s) => s.promoteIdea);
  const addIdea = useStore((s) => s.addIdea);
  const toast = useStore((s) => s.toast);
  const router = useRouter();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Card
      n={7}
      tone="violet"
      title="Idea Vault"
      subtitle="Capture. Refine. Make it real."
      delay={0.42}
      right={
        <button type="button" aria-label="Capture an idea" onClick={() => setDraft("")} className="grid size-6.5 cursor-pointer place-items-center rounded-md border border-line text-fg-2 hover:border-nx-lilac hover:text-fg">
          <Plus className="size-3.5" />
        </button>
      }
    >
      {draft !== null && (
        <form
          className="mb-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) addIdea(draft.trim(), "Idea");
            setDraft(null);
          }}
        >
          <input autoFocus aria-label="New idea" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => setDraft(null)} placeholder="Capture an idea, press Enter" className="nx-input !py-1 !text-xs" />
        </form>
      )}
      <ul className="flex-1 space-y-1">
        {ideas.slice(0, draft === null ? 3 : 2).map((i) => (
          <li key={i.id} className="flex items-center gap-1.5 text-xs">
            <span className="size-1.5 shrink-0 rounded-full bg-nx-amber" />
            <span className="min-w-0 flex-1 truncate text-fg" title={i.title}>
              {i.title}
            </span>
            <span className="shrink-0 rounded-md border border-nx-pink/30 bg-nx-pink/8 px-1.5 py-0.5 text-[0.625rem] text-[#ff9fdc]">{i.tag}</span>
            <button type="button" aria-label={i.starred ? `Unstar ${i.title}` : `Star ${i.title}`} aria-pressed={i.starred} onClick={() => toggle(i.id)} className="cursor-pointer transition-transform hover:scale-125">
              <Star className={cn("size-3.5", i.starred ? "fill-nx-amber text-nx-amber" : "text-fg-3")} />
            </button>
          </li>
        ))}
        {ideas.length === 0 && <li className="py-3 text-center text-xs text-fg-3">The vault is empty. Capture your next idea.</li>}
      </ul>
      <div className="pt-2">
        <Btn
          tone="rose"
          className="h-8 w-full"
          disabled={ideas.length === 0}
          onClick={() => {
            const top = ideas.find((i) => i.starred) ?? ideas[0];
            if (!top) return;
            promote(top.id);
            toast(`"${top.title}" is now a goal with a plan`);
            router.push("/goals");
          }}
        >
          Turn Ideas into Plans <ArrowRight className="ml-auto size-3.5" />
        </Btn>
      </div>
    </Card>
  );
}

export function PrivacyVault() {
  const privacy = useStore((s) => s.privacy);
  const permissions = useStore((s) => s.permissions);
  const custom = Object.values(permissions).some((p) => p.length > 1);

  const tiles = [
    { icon: Lock, color: "#34d399", title: "Memory Access", value: privacy.memoryAccess },
    { icon: UsersRound, color: "#c084fc", title: "Data Sharing", value: privacy.dataSharing ? "Family Circle" : "Off" },
    { icon: UserRoundCheck, color: "#f472b6", title: "Agent Permissions", value: custom ? "Custom" : "Read only" },
    { icon: Trash2, color: "#f4407f", title: "Auto Delete", value: `${privacy.autoDelete} days` },
  ];

  return (
    <Card
      n={8}
      title={
        <span className="flex items-baseline gap-3">
          Privacy Vault <span className="hidden text-[0.6875rem] font-normal text-fg-2 sm:inline">Your Life. Your Data. Your Rules.</span>
        </span>
      }
      delay={0.46}
    >
      <div className="flex flex-1 gap-3">
        <div className="min-w-0 flex-1">
          <ul className="grid grid-cols-3 gap-1.5 max-sm:grid-cols-2">
            {tiles.map((t) => (
              <li key={t.title}>
                <Link href="/privacy" className="nx-tile flex h-full items-center gap-1.5 px-1.5 py-1.5">
                  <t.icon className="size-4.5 shrink-0" style={{ color: t.color }} strokeWidth={1.7} />
                  <span className="min-w-0">
                    <span className="block truncate text-[0.6875rem] leading-4 text-fg">{t.title}</span>
                    <span className="block truncate text-[0.625rem] text-fg-3">{t.value}</span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="col-span-2 flex items-center justify-center max-sm:col-span-2">
              <Link href="/privacy" className="nx-btn h-7.5 min-w-[12.5rem] px-5 text-xs max-sm:w-full">
                Manage Privacy
              </Link>
            </li>
          </ul>
        </div>
        <VaultShield />
      </div>
    </Card>
  );
}

function VaultShield() {
  return (
    <div className="relative hidden w-[6.4rem] shrink-0 place-items-center self-center sm:grid">
      <span className="absolute size-24 animate-glow rounded-full bg-nx-violet/35 blur-2xl" />
      <svg viewBox="0 0 100 118" className="relative w-full overflow-visible" role="img" aria-label="Encrypted vault">
        <defs>
          <linearGradient id="nx-shield" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9b8ff" />
            <stop offset="0.5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4bb8" />
          </linearGradient>
        </defs>
        <path d="M50 4 L92 18 V58 C92 86 70 104 50 114 C30 104 8 86 8 58 V18 Z" fill="rgb(68 30 150 / 0.4)" stroke="url(#nx-shield)" strokeWidth="3.5" />
        <path d="M50 15 L82 26 V58 C82 79 66 93 50 102 C34 93 18 79 18 58 V26 Z" fill="none" stroke="#c4a5ff" strokeOpacity="0.45" strokeWidth="1.2" className="nx-dash-flow" />
        <rect x="35" y="52" width="30" height="24" rx="5" fill="#e9dcff" />
        <path d="M41 52 V44 a9 9 0 0 1 18 0 V52" fill="none" stroke="#e9dcff" strokeWidth="4" />
        <circle cx="50" cy="62" r="3.5" fill="#3b1a8f" />
        <rect x="48.4" y="62" width="3.2" height="8" rx="1.6" fill="#3b1a8f" />
      </svg>
    </div>
  );
}

export function AutomationCard() {
  const workflows = useStore((s) => s.workflows);
  const icons = [Smartphone, Monitor, Tablet];
  return (
    <Card delay={0.5} bodyClass="!flex-row gap-3 !p-3 max-sm:!flex-col">
      <div className="flex w-[15.2rem] shrink-0 flex-col max-2xl:w-[13rem] max-sm:w-full">
        <div className="flex items-start gap-2.5">
          <NumBadge n={9} tone="blue" />
          <div className="min-w-0">
            <h2 className="text-base leading-6 font-semibold">Automation Hub</h2>
            <p className="-mt-0.5 text-[0.6875rem] leading-4 text-fg-3">Everything connected. Always synchronized.</p>
          </div>
        </div>
        <DeviceScene />
      </div>

      <ul className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {workflows.slice(0, 3).map((w, i) => {
          const Icon = icons[i % 3] ?? Clock;
          return (
            <li key={w.id} className="nx-tile flex items-center gap-2 px-2 py-1.5">
              <Icon className="size-4.5 shrink-0 text-fg-2" strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.6875rem] leading-4 text-fg">{w.name}</span>
                <span className="block truncate text-[0.625rem] text-fg-3" suppressHydrationWarning>
                  Last run: {timeAgo(w.lastRun)}
                </span>
              </span>
              <span className={cn("text-[0.625rem] font-medium", w.enabled ? "text-nx-green" : "text-nx-amber")}>{w.enabled ? "Active" : "Idle"}</span>
            </li>
          );
        })}
        <li className="2xl:hidden">
          <Link href="/automations" className="nx-btn h-7 w-full px-3 text-[0.6875rem]" data-tone="ghost">
            View All Flows <ArrowRight className="size-3" />
          </Link>
        </li>
      </ul>

      <div className="hidden w-[8.4rem] shrink-0 flex-col items-center justify-center gap-2 2xl:flex">
        <Laptop />
        <Link href="/automations" className="nx-btn h-7 w-full px-2 text-[0.6875rem]" data-tone="ghost">
          View All Flows <ArrowRight className="size-3" />
        </Link>
      </div>
    </Card>
  );
}

function Laptop() {
  return (
    <div className="w-full">
      <div className="mx-auto aspect-[16/10] w-[88%] overflow-hidden rounded-t-md border-2 border-[#7c66b8] bg-gradient-to-b from-[#3a1a8e] to-[#16072f] p-1">
        <Mascot variant="head" className="mx-auto h-full" />
      </div>
      <div className="h-1.5 rounded-b-md bg-gradient-to-b from-[#a899d1] to-[#5f5188]" />
    </div>
  );
}

function DeviceScene() {
  return (
    <div className="relative mx-auto mt-auto hidden h-[5.5rem] w-[11rem] shrink-0 sm:block" aria-hidden>
      <div className="absolute right-0 bottom-0 left-6">
        <Laptop />
      </div>
      <div className="absolute bottom-0 left-0 h-[4.7rem] w-[2.4rem] overflow-hidden rounded-lg border-2 border-[#8f7dc8] bg-gradient-to-b from-[#3a1a8e] to-[#16072f] p-0.5">
        <Mascot variant="head" className="mt-2 w-full" />
      </div>
    </div>
  );
}
