"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bell, ChevronDown, LockKeyhole, LogOut, Menu, Search, Settings, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";
import { saveWorkspace } from "@/lib/workspace-sync";

async function signOut() {
  await saveWorkspace();
  await authClient.signOut();
  window.location.assign("/login");
}

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Popover({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className={cn("nx-card nx-solid absolute top-full right-0 z-40 mt-2 origin-top-right", className)}
    >
      {children}
    </motion.div>
  );
}

function StatusPill({
  on,
  onClick,
  label,
  offLabel,
  icon,
  className,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  offLabel: string;
  icon: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-8.5 cursor-pointer items-center gap-2 rounded-full border bg-white/3 px-3.5 text-[0.8125rem] whitespace-nowrap transition-all hover:bg-white/8",
        on ? "text-fg" : "text-fg-3",
        className,
      )}
    >
      {icon}
      {on ? label : offLabel}
    </button>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const online = useStore((s) => s.online);
  const privateMode = useStore((s) => s.privateMode);
  const safeMode = useStore((s) => s.safeMode);
  const notices = useStore((s) => s.notices);
  const profile = useStore((s) => s.profile);
  const account = useStore((s) => s.account);
  const setPill = useStore((s) => s.setPill);
  const setUi = useStore((s) => s.setUi);
  const toast = useStore((s) => s.toast);
  const markRead = useStore((s) => s.markNoticesRead);

  const [bellOpen, setBellOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const bellRef = useDismiss(bellOpen, () => setBellOpen(false));
  const userRef = useDismiss(userOpen, () => setUserOpen(false));
  const unread = notices.filter((n) => !n.read).length;

  return (
    <header className="relative z-30 flex h-[4.15rem] shrink-0 items-center gap-3 px-3 md:pr-5 md:pl-4">
      <button type="button" aria-label="Open menu" onClick={onMenu} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-line text-fg-2 xl:hidden">
        <Menu className="size-5" />
      </button>

      <button
        id="tour-search"
        type="button"
        onClick={() => setUi({ paletteOpen: true })}
        className="flex h-10 min-w-0 flex-1 cursor-text items-center gap-3 rounded-xl border border-line bg-white/3 px-3.5 text-left text-[0.8125rem] text-fg-3 transition-colors hover:border-line-strong lg:max-w-[33.5rem]"
      >
        <Search className="size-4.5 shrink-0" />
        <span className="truncate">Search anything... (e.g., goals, memories, agents, docs)</span>
        <kbd className="ml-auto hidden shrink-0 font-sans text-xs text-fg-2 sm:block">⌘ K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2.5 xl:flex">
          <StatusPill
            on={online}
            label="AI Online"
            offLabel="AI Paused"
            onClick={() => {
              setPill("online", !online);
              toast(online ? "Agents paused" : "Agents back online", "info");
            }}
            className="border-nx-green/30"
            icon={
              <span className="relative flex size-2.5">
                {online && <span className="absolute inset-0 animate-ping rounded-full bg-nx-green opacity-70" />}
                <span className={cn("relative size-2.5 rounded-full", online ? "bg-nx-green" : "bg-fg-3")} />
              </span>
            }
          />
          <StatusPill
            on={privateMode}
            label="Private Mode"
            offLabel="Private Off"
            onClick={() => {
              setPill("privateMode", !privateMode);
              toast(privateMode ? "Private Mode off" : "Private Mode on", "info");
            }}
            className="border-line"
            icon={<LockKeyhole className="size-4 text-nx-amber" />}
          />
          <StatusPill
            on={safeMode}
            label="Safe Mode"
            offLabel="Auto Mode"
            onClick={() => {
              setPill("safeMode", !safeMode);
              toast(safeMode ? "Auto Mode: agents finish without approval" : "Safe Mode: agents ask before acting", "info");
            }}
            className="border-nx-blue/40"
            icon={<ShieldCheck className="size-4 fill-nx-blue/40 text-nx-blue" />}
          />
        </div>

        <span className="mx-1 hidden h-8 w-px bg-line xl:block" />

        <div ref={bellRef} className="relative">
          <button
            type="button"
            aria-label={`Notifications, ${unread} unread`}
            aria-expanded={bellOpen}
            onClick={() => {
              setBellOpen(!bellOpen);
              setUserOpen(false);
            }}
            className="relative grid size-10 cursor-pointer place-items-center rounded-full text-fg transition-colors hover:bg-white/8"
          >
            <Bell className={cn("size-5.5", unread > 0 && "animate-ring origin-top")} strokeWidth={1.7} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-2 flex size-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-nx-rose opacity-70" />
                <span className="relative size-2.5 rounded-full bg-nx-rose" />
              </span>
            )}
          </button>
          <AnimatePresence>
            {bellOpen && (
              <Popover className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button type="button" onClick={markRead} className="cursor-pointer text-xs text-nx-lilac hover:underline">
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-80 overflow-y-auto">
                  {notices.slice(0, 8).map((n) => (
                    <li key={n.id}>
                      <Link href={n.href ?? "/"} onClick={() => setBellOpen(false)} className="flex gap-2.5 rounded-lg p-2 hover:bg-white/6">
                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-white/15" : "bg-nx-pink")} />
                        <span className="min-w-0">
                          <span className="block text-[0.8125rem] text-fg">{n.title}</span>
                          <span className="block text-xs text-fg-3">{n.detail}</span>
                          <span className="mt-0.5 block text-[0.6875rem] text-fg-3" suppressHydrationWarning>
                            {timeAgo(n.at)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Popover>
            )}
          </AnimatePresence>
        </div>

        <span className="mx-1 hidden h-8 w-px bg-line md:block" />

        <div ref={userRef} className="relative">
          <button
            type="button"
            aria-expanded={userOpen}
            onClick={() => {
              setUserOpen(!userOpen);
              setBellOpen(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-full py-1 pr-1 transition-colors hover:bg-white/5 md:pr-2"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#ff5cc0] via-[#8b5cf6] to-[#4f7cff] p-0.5">
              <span className="grid size-full place-items-center rounded-full bg-[#1c1138] text-sm font-semibold">{profile.name.slice(0, 1).toUpperCase()}</span>
            </span>
            <span className="hidden text-left text-sm leading-[1.1rem] md:block">
              <span className="block text-fg">{profile.name}</span>
              <span className="block text-xs text-fg-3">{profile.role}</span>
            </span>
            <ChevronDown className={cn("hidden size-4 text-fg-3 transition-transform md:block", userOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {userOpen && (
              <Popover className="w-56 p-1.5">
                {account && <p className="truncate px-2.5 pt-1.5 pb-2 text-xs text-fg-3">{account.email}</p>}
                {[
                  { href: "/settings", label: "Profile & settings", icon: UserRound },
                  { href: "/goals", label: "My goals", icon: Target },
                  { href: "/privacy", label: "Privacy vault", icon: LockKeyhole },
                  { href: "/settings#plan", label: "Plan & billing", icon: Sparkles },
                  { href: "/settings#roadmap", label: "Product roadmap", icon: Settings },
                ].map((i) => (
                  <Link key={i.label} href={i.href} onClick={() => setUserOpen(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-fg-2 hover:bg-white/6 hover:text-fg">
                    <i.icon className="size-4" strokeWidth={1.7} />
                    {i.label}
                  </Link>
                ))}
                {account && (
                  <button type="button" onClick={() => void signOut()} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.8125rem] text-fg-2 hover:bg-white/6 hover:text-fg">
                    <LogOut className="size-4" strokeWidth={1.7} />
                    Sign out
                  </button>
                )}
              </Popover>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
