"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, Clock, Inbox, X } from "lucide-react";
import { useState } from "react";
import { Btn, Page, Pill, Segmented, enter } from "@/components/ui";
import { ACTION_ICONS, agentById } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

export default function ActionsPage() {
  const actions = useStore((s) => s.actions);
  const history = useStore((s) => s.history);
  const resolve = useStore((s) => s.resolveAction);
  const snooze = useStore((s) => s.snoozeAction);
  const toast = useStore((s) => s.toast);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [open, setOpen] = useState<string | null>(actions[0]?.id ?? null);

  const lowRisk = actions.filter((a) => a.priority === "Low");

  return (
    <Page
      title="Actions"
      subtitle="Everything your agents prepared. Nothing happens until you approve it."
      actions={
        <>
          <Segmented
            id="actions"
            value={tab}
            onChange={setTab}
            options={[
              { value: "pending", label: `Pending (${actions.length})` },
              { value: "history", label: "History" },
            ]}
          />
          <Btn
            tone="green"
            disabled={lowRisk.length === 0}
            onClick={() => {
              lowRisk.forEach((a) => resolve(a.id, "approved"));
              toast(`Approved ${lowRisk.length} low-risk ${lowRisk.length === 1 ? "action" : "actions"}`);
            }}
          >
            <CheckCheck className="size-4" /> Approve low risk
          </Btn>
        </>
      }
    >
      {tab === "pending" ? (
        <ul>
          <AnimatePresence initial={false}>
            {actions.map((a, i) => {
              const Icon = ACTION_ICONS[a.icon];
              const def = agentById(a.agent);
              const expanded = open === a.id;
              return (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.02 }}
                  className="overflow-hidden"
                >
                  <div className="nx-card mb-2">
                    <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : a.id)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-nx-violet/18 text-nx-lilac">
                        <Icon className="size-5" strokeWidth={1.7} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] text-fg">{a.title}</span>
                        <span className="flex items-center gap-1.5 text-xs text-fg-3">
                          <def.icon className="size-3.5" style={{ color: def.color }} /> {def.name}
                        </span>
                      </span>
                      {a.value && <span className="text-sm font-semibold tabular-nums">{a.value}</span>}
                      {a.priority && (
                        <Pill className={a.priority === "High" ? "border-nx-rose/50 text-[#ff8fb5]" : a.priority === "Medium" ? "border-nx-amber/40 text-nx-amber" : "border-line text-fg-2"}>
                          {a.priority}
                        </Pill>
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line/60 px-4 py-3">
                            <div className="max-w-2xl">
                              <p className="text-sm leading-6 text-fg-2">{a.summary}</p>
                              <p className="mt-1 text-xs text-nx-lilac">{a.impact}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Btn size="sm" tone="ghost" onClick={() => snooze(a.id)}>
                                <Clock className="size-3.5" /> Snooze
                              </Btn>
                              <Btn size="sm" tone="rose" onClick={() => resolve(a.id, "declined")}>
                                <X className="size-3.5" /> Decline
                              </Btn>
                              <Btn size="sm" tone="green" onClick={() => resolve(a.id, "approved")}>
                                <Check className="size-3.5" /> Approve
                              </Btn>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
          {actions.length === 0 && (
            <motion.li {...enter()} className="nx-card flex flex-col items-center gap-2 py-16 text-center">
              <Inbox className="size-8 text-nx-lilac" strokeWidth={1.5} />
              <p className="text-base font-medium">You&apos;re all caught up</p>
              <p className="text-sm text-fg-3">New results from your agents will appear here.</p>
            </motion.li>
          )}
        </ul>
      ) : (
        <motion.ul {...enter()} className="nx-card divide-y divide-line/50">
          {history.map((h) => {
            const def = agentById(h.agent);
            const ok = h.outcome === "approved";
            return (
              <li key={h.id} className="flex items-center gap-3 px-4 py-2.5">
                {ok ? <Check className="size-4.5 shrink-0 text-nx-green" /> : <X className="size-4.5 shrink-0 text-nx-rose" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{h.title}</span>
                  <span className="text-xs text-fg-3">
                    {def.name} · {ok ? "Approved" : "Declined"}
                  </span>
                </span>
                <span className={cn("text-xs text-fg-3")} suppressHydrationWarning>
                  {timeAgo(h.at)}
                </span>
              </li>
            );
          })}
        </motion.ul>
      )}
    </Page>
  );
}
