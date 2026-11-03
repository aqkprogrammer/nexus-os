"use client";

import { motion } from "motion/react";
import { Download, Eye, Lock, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { Btn, Card, Modal, Page, Toggle } from "@/components/ui";
import { AGENTS, AUDIT_LOG, agentById, PERMISSIONS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, timeAgo } from "@/lib/utils";

const PERMISSION_HELP = { read: "See your data", write: "Change drafts and notes", send: "Message others", spend: "Move money" };

export default function PrivacyPage() {
  const privacy = useStore((s) => s.privacy);
  const setPrivacy = useStore((s) => s.setPrivacy);
  const permissions = useStore((s) => s.permissions);
  const togglePermission = useStore((s) => s.togglePermission);
  const eraseMemories = useStore((s) => s.eraseMemories);
  const privateMode = useStore((s) => s.privateMode);
  const setPill = useStore((s) => s.setPill);
  const memories = useStore((s) => s.memories.length);
  const sample = useStore((s) => s.sample);
  const runs = useStore((s) => s.runs);
  // The sample keeps its invented log. A real account only lists what its agents actually did.
  const log = sample ? AUDIT_LOG : runs.map((r) => ({ who: agentById(r.agent).name, what: `ran "${r.task}"`, at: timeAgo(r.at) }));
  const toast = useStore((s) => s.toast);
  const [confirming, setConfirming] = useState(false);

  const account = useStore((s) => s.account);

  const exportData = () => {
    // A signed-in account downloads everything stored on the server, not just this page's copy.
    if (account) {
      window.location.assign("/api/account/export");
      return;
    }
    const { memories: m, goals, ideas, priorities, events, habits, workflows, permissions: p, privacy: pv } = useStore.getState();
    const blob = new Blob([JSON.stringify({ memories: m, goals, ideas, priorities, events, habits, workflows, permissions: p, privacy: pv }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-os-export.json";
    a.click();
    URL.revokeObjectURL(url);
    toast("Your data export is ready");
  };

  return (
    <Page title="Privacy Vault" subtitle="Your Life. Your Data. Your Rules.">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-3">
          <Card title="Vault Controls">
            <ul className="divide-y divide-line/50">
              <li className="flex items-center gap-3 py-2.5">
                <Eye className="size-5 shrink-0 text-nx-lilac" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">Private Mode</span>
                  <span className="block text-xs text-fg-3">Process your data privately and never use it for training.</span>
                </span>
                <Toggle on={privateMode} label="Private Mode" onChange={(v) => setPill("privateMode", v)} />
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <Lock className="size-5 shrink-0 text-nx-green" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">Memory access</span>
                  <span className="block text-xs text-fg-3">Who can see what Nexus remembers.</span>
                </span>
                <select aria-label="Memory access" value={privacy.memoryAccess} onChange={(e) => setPrivacy({ memoryAccess: e.target.value as typeof privacy.memoryAccess })} className="nx-input !w-36 !py-1.5">
                  <option>Only you</option>
                  <option>Family Circle</option>
                </select>
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <UsersRound className="size-5 shrink-0 text-[#c084fc]" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">Data sharing</span>
                  <span className="block text-xs text-fg-3">Share selected context with your Family Circle.</span>
                </span>
                <Toggle on={privacy.dataSharing} label="Data sharing" onChange={(v) => setPrivacy({ dataSharing: v })} />
              </li>
              <li className="flex items-center gap-3 py-2.5">
                <Trash2 className="size-5 shrink-0 text-nx-rose" strokeWidth={1.7} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">Auto delete</span>
                  <span className="block text-xs text-fg-3">Remove unpinned memories after this period.</span>
                </span>
                <select aria-label="Auto delete period" value={privacy.autoDelete} onChange={(e) => setPrivacy({ autoDelete: Number(e.target.value) as typeof privacy.autoDelete })} className="nx-input !w-36 !py-1.5">
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={365}>1 year</option>
                </select>
              </li>
            </ul>
          </Card>

          <Card title="Agent Permissions" subtitle="Each agent only gets what you grant here." delay={0.08}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-3">
                    <th className="py-1.5 font-medium">Agent</th>
                    {PERMISSIONS.map((p) => (
                      <th key={p} className="px-2 py-1.5 text-center font-medium capitalize" title={PERMISSION_HELP[p]}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.map((a) => (
                    <tr key={a.id} className="border-t border-line/40">
                      <th className="py-1.5 text-left font-normal">
                        <span className="flex items-center gap-2">
                          <a.icon className="size-4.5" style={{ color: a.color }} strokeWidth={1.7} />
                          {a.name}
                        </span>
                      </th>
                      {PERMISSIONS.map((p) => {
                        const on = permissions[a.id].includes(p);
                        return (
                          <td key={p} className="px-2 py-1.5 text-center">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.8 }}
                              role="checkbox"
                              aria-checked={on}
                              aria-label={`${a.name} can ${p}`}
                              onClick={() => togglePermission(a.id, p)}
                              className={cn("mx-auto block size-5 cursor-pointer rounded-md border transition-colors", on ? "border-nx-lilac bg-gradient-to-b from-[#9d6bff] to-[#6d3fe0]" : "border-line bg-white/4 hover:border-nx-lilac")}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card title="Audit Log" subtitle="Every time anything touched your data." delay={0.12}>
            <ol className="space-y-2.5">
              {log.map((l, i) => (
                <li key={i} className="flex gap-2.5 text-[0.8125rem]">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-nx-violet" />
                  <span className="min-w-0 flex-1">
                    <span className="text-fg">{l.who}</span> <span className="text-fg-2">{l.what}</span>
                    <span className="block text-[0.6875rem] text-fg-3" suppressHydrationWarning>
                      {l.at}
                    </span>
                  </span>
                </li>
              ))}
              {log.length === 0 && <li className="text-[0.8125rem] text-fg-3">No agent has touched your data yet.</li>}
            </ol>
          </Card>

          <Card title="Your Data" subtitle={`${memories} memories stored`} delay={0.16}>
            <div className="space-y-2">
              <Btn tone="ghost" className="w-full" onClick={exportData}>
                <Download className="size-4" /> Export everything
              </Btn>
              <Btn tone="rose" className="w-full" disabled={memories === 0} onClick={() => setConfirming(true)}>
                <Trash2 className="size-4" /> Erase all memories
              </Btn>
            </div>
          </Card>
        </div>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Erase all memories?" subtitle={`This removes ${memories} memories from your AI Brain. You'll have a few seconds to undo it.`}>
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setConfirming(false)}>
            Keep memories
          </Btn>
          <Btn
            tone="rose"
            onClick={() => {
              eraseMemories();
              setConfirming(false);
            }}
          >
            Erase memories
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
