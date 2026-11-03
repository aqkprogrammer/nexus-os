"use client";

import { motion } from "motion/react";
import { CheckCircle2, Circle, Compass, Crown, LoaderCircle, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, Btn, Card, Modal, Page, Pill, Toggle } from "@/components/ui";
import { ROADMAP } from "@/lib/data";
import { useStore } from "@/lib/store";

const DEVICES = [
  { icon: Smartphone, name: "iPhone 15 Pro", sync: "Last sync: 2 min ago", active: true },
  { icon: Monitor, name: "MacBook Pro", sync: "Last sync: 5 min ago", active: true },
  { icon: Tablet, name: "iPad Air", sync: "Last sync: 1 hr ago", active: false },
];

/** Where the interface stands against the 90-day plan. */
const ROADMAP_UI = ["UI built", "UI built", "UI built", "UI built", "UI built", "Next"];

function Row({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{title}</span>
        <span className="block text-xs text-fg-3">{note}</span>
      </span>
      {children}
    </li>
  );
}

export default function SettingsPage() {
  const profile = useStore((s) => s.profile);
  const prefs = useStore((s) => s.prefs);
  const setProfile = useStore((s) => s.setProfile);
  const setPrefs = useStore((s) => s.setPrefs);
  const resetDemo = useStore((s) => s.resetDemo);
  const memories = useStore((s) => s.memories.length);
  const toast = useStore((s) => s.toast);
  const setTourDone = useStore((s) => s.setTourDone);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const used = Math.min(100, 57 + memories);

  return (
    <Page title="Settings" subtitle="Make Nexus OS work the way you do.">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Profile">
          <div className="grid gap-3 pt-1 sm:grid-cols-2">
            <label className="block text-xs text-fg-2">
              Name
              <input value={profile.name} onChange={(e) => setProfile({ name: e.target.value })} className="nx-input mt-1.5" />
            </label>
            <label className="block text-xs text-fg-2">
              Companion tone
              <select value={profile.companionTone} onChange={(e) => setProfile({ companionTone: e.target.value as typeof profile.companionTone })} className="nx-input mt-1.5">
                <option>Warm</option>
                <option>Direct</option>
                <option>Playful</option>
              </select>
            </label>
          </div>
        </Card>

        <Card title="Appearance" delay={0.05}>
          <ul className="divide-y divide-line/50">
            <Row title="Animations" note="Motion across the interface.">
              <Toggle on={prefs.motion} label="Animations" onChange={(v) => setPrefs({ motion: v })} />
            </Row>
            <Row title="Living galaxy" note="The animated starfield behind your greeting.">
              <Toggle on={prefs.ambient} label="Living galaxy" onChange={(v) => setPrefs({ ambient: v })} />
            </Row>
          </ul>
        </Card>

        <Card title="Notifications" delay={0.1}>
          <ul className="divide-y divide-line/50">
            <Row title="Push alerts" note="When an agent needs your approval.">
              <Toggle on={prefs.pushAlerts} label="Push alerts" onChange={(v) => setPrefs({ pushAlerts: v })} />
            </Row>
            <Row title="Email digest" note="A daily summary at 7:00 AM.">
              <Toggle on={prefs.emailDigest} label="Email digest" onChange={(v) => setPrefs({ emailDigest: v })} />
            </Row>
            <Row title="Weekly review" note="Your week, scored every Sunday.">
              <Toggle on={prefs.weeklyReview} label="Weekly review" onChange={(v) => setPrefs({ weeklyReview: v })} />
            </Row>
          </ul>
        </Card>

        <Card id="plan" title="Plan & Storage" delay={0.15} className="scroll-mt-4">
          <div className="flex items-center gap-3 pt-1">
            <Crown className="size-8 fill-nx-amber/30 text-nx-amber" strokeWidth={1.5} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Nexus Pro</div>
              <div className="text-xs text-fg-3">All agents, unlimited workflows</div>
            </div>
            <Btn size="sm" tone="ghost" onClick={() => toast("Billing arrives with the Days 76-90 milestone", "info")}>
              Change plan
            </Btn>
          </div>
          <div className="mt-4 flex justify-between text-xs text-fg-2">
            <span>AI Memory</span>
            <span>{used} GB of 100 GB</span>
          </div>
          <Bar value={used} className="mt-1.5" />
        </Card>

        <Card title="Devices" delay={0.2}>
          <ul className="space-y-1.5">
            {DEVICES.map((d) => (
              <li key={d.name} className="nx-tile flex items-center gap-3 px-3 py-2">
                <d.icon className="size-5 text-fg-2" strokeWidth={1.6} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{d.name}</span>
                  <span className="block text-xs text-fg-3">{d.sync}</span>
                </span>
                <Pill className={d.active ? "border-nx-green/40 text-nx-green" : "border-nx-amber/40 text-nx-amber"}>{d.active ? "Active" : "Idle"}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Demo Data" subtitle="Everything you change is saved in this browser." delay={0.25}>
          <div className="flex flex-wrap gap-2 pt-1">
            <Btn
              tone="ghost"
              onClick={() => {
                setTourDone(false);
                router.push("/");
              }}
            >
              <Compass className="size-4" /> Replay tour
            </Btn>
            <Btn tone="rose" onClick={() => setConfirming(true)}>
              <RotateCcw className="size-4" /> Reset to sample data
            </Btn>
          </div>
        </Card>

        <Card id="roadmap" title="90-Day Roadmap" subtitle="The delivery plan for the full product." delay={0.3} className="scroll-mt-4 lg:col-span-2">
          <ol className="grid gap-2 pt-1 sm:grid-cols-2 xl:grid-cols-6">
            {ROADMAP.map((r, i) => {
              const state = ROADMAP_UI[i];
              const Icon = state === "UI built" ? CheckCircle2 : state === "Next" ? LoaderCircle : Circle;
              return (
                <motion.li key={r.days} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="nx-tile p-3">
                  <div className="flex items-center justify-between text-xs text-fg-3">
                    {r.days}
                    <Icon className={state === "Next" ? "size-4 text-nx-amber" : "size-4 text-nx-green"} />
                  </div>
                  <div className="mt-1 text-sm font-medium">{r.title}</div>
                  <div className="mt-0.5 text-xs leading-5 text-fg-2">{r.items}</div>
                  <div className="mt-1.5 text-[0.6875rem] text-nx-lilac">{state}</div>
                </motion.li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Reset to sample data?" subtitle="This replaces your priorities, memories, goals and settings with the sample data. It can't be undone.">
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Btn>
          <Btn
            tone="rose"
            onClick={() => {
              resetDemo();
              setConfirming(false);
              toast("Sample data restored");
            }}
          >
            Reset
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
