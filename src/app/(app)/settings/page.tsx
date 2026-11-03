"use client";

import { motion } from "motion/react";
import { CheckCircle2, Circle, Compass, Crown, Eraser, LoaderCircle, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccountSettings } from "@/components/AccountSettings";
import { PlanCard } from "@/components/PlanCard";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push-client";
import { Bar, Btn, Card, Modal, Page, Pill, Toggle } from "@/components/ui";
import { ROADMAP } from "@/lib/data";
import { useStore } from "@/lib/store";

const CONFIRM = {
  sample: {
    title: "Load the sample data?",
    subtitle: "This replaces your priorities, memories, goals and settings with the sample data. It can't be undone.",
    button: "Load sample data",
    done: "Sample data loaded",
  },
  empty: {
    title: "Clear your workspace?",
    subtitle: "This removes every priority, memory, goal, event and automation. It can't be undone.",
    button: "Clear everything",
    done: "Workspace cleared",
  },
};

const DEVICES = [
  { icon: Smartphone, name: "iPhone 15 Pro", sync: "Last sync: 2 min ago", active: true },
  { icon: Monitor, name: "MacBook Pro", sync: "Last sync: 5 min ago", active: true },
  { icon: Tablet, name: "iPad Air", sync: "Last sync: 1 hr ago", active: false },
];

/** Where the product stands against the 90-day plan. Workflows still run on demand, and onboarding beyond the tour is still to do. */
const ROADMAP_UI = ["Built", "Built", "Built", "Built", "Partly built", "Partly built"];

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

function NotificationPermission() {
  const [state, setState] = useState<NotificationPermission | "unsupported" | null>(null);
  useEffect(() => setState(typeof Notification === "undefined" ? "unsupported" : Notification.permission), []);

  if (state === "granted") return <Pill className="border-nx-green/40 text-nx-green">On</Pill>;
  if (state === "denied") return <span className="text-xs text-fg-3">Blocked in browser settings</span>;
  if (state === "unsupported") return <span className="text-xs text-fg-3">Not supported here</span>;
  return (
    <Btn size="sm" tone="ghost" onClick={async () => setState(await Notification.requestPermission())}>
      Turn on
    </Btn>
  );
}

const PUSH_NOTES: Partial<Record<PushState, string>> = {
  unsupported: "Not supported in this browser. On iPhone, add NEXUS OS to your home screen first.",
  unconfigured: "Not set up on this server yet",
  denied: "Blocked in browser settings",
};

function PushSetting() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useStore((s) => s.toast);
  useEffect(() => {
    void pushState().then(setState);
  }, []);

  if (!state) return null;
  const note = PUSH_NOTES[state];
  if (note) return <span className="max-w-[14rem] text-right text-xs text-fg-3">{note}</span>;
  return (
    <Toggle
      on={state === "on"}
      label="Push notifications"
      onChange={async (on) => {
        if (busy) return;
        setBusy(true);
        try {
          setState(on ? await enablePush() : await disablePush());
        } catch (e) {
          toast(e instanceof Error ? e.message : "Couldn't change push notifications.", "warn");
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

export default function SettingsPage() {
  const profile = useStore((s) => s.profile);
  const prefs = useStore((s) => s.prefs);
  const setProfile = useStore((s) => s.setProfile);
  const setPrefs = useStore((s) => s.setPrefs);
  const loadSample = useStore((s) => s.loadSample);
  const clearWorkspace = useStore((s) => s.clearWorkspace);
  const memories = useStore((s) => s.memories.length);
  const sample = useStore((s) => s.sample);
  const account = useStore((s) => s.account);
  const toast = useStore((s) => s.toast);
  const setTourDone = useStore((s) => s.setTourDone);
  const router = useRouter();
  const [confirming, setConfirming] = useState<keyof typeof CONFIRM | null>(null);
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
            {/* An account gets the real push switch below instead. */}
            {!account && (
              <Row title="Push alerts" note="When an agent needs your approval.">
                <Toggle on={prefs.pushAlerts} label="Push alerts" onChange={(v) => setPrefs({ pushAlerts: v })} />
              </Row>
            )}
            <Row title="Email digest" note="A daily summary at 7:00 AM.">
              <Toggle on={prefs.emailDigest} label="Email digest" onChange={(v) => setPrefs({ emailDigest: v })} />
            </Row>
            {account ? (
              <Row title="Push notifications" note="Agent results on this device, even when NEXUS OS is closed.">
                <PushSetting />
              </Row>
            ) : (
              <Row title="Browser notifications" note="Event reminders and agent results, even in another tab.">
                <NotificationPermission />
              </Row>
            )}
            <Row title="Weekly review" note="Your week, scored every Sunday.">
              <Toggle on={prefs.weeklyReview} label="Weekly review" onChange={(v) => setPrefs({ weeklyReview: v })} />
            </Row>
          </ul>
        </Card>

        {account ? (
          <PlanCard />
        ) : (
          <Card id="plan" title="Plan & Storage" delay={0.15} className="scroll-mt-4">
            <div className="flex items-center gap-3 pt-1">
              <Crown className="size-8 fill-nx-amber/30 text-nx-amber" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{sample ? "Nexus Pro" : "Early access"}</div>
                <div className="text-xs text-fg-3">{sample ? "All agents, unlimited workflows" : "Free while NEXUS OS is in early access"}</div>
              </div>
              <Btn size="sm" tone="ghost" onClick={() => toast("Billing arrives with the Days 76-90 milestone", "info")}>
                Change plan
              </Btn>
            </div>
            <div className="mt-4 flex justify-between text-xs text-fg-2">
              <span>AI Memory</span>
              <span>{sample ? `${used} GB of 100 GB` : `${memories} ${memories === 1 ? "memory" : "memories"} saved`}</span>
            </div>
            {sample && <Bar value={used} className="mt-1.5" />}
          </Card>
        )}

        {account && <AccountSettings />}

        {/* The device list is invented, so only the demo shows it. */}
        {!account && sample && (
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
        )}

        <Card title={account ? "Workspace" : "Demo Data"} subtitle={account ? "Saved to your account." : "Everything you change is saved in this browser."} delay={0.25}>
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
            <Btn tone={account ? "ghost" : "rose"} onClick={() => setConfirming("sample")}>
              <RotateCcw className="size-4" /> {account ? "Load sample data" : "Reset to sample data"}
            </Btn>
            {account && (
              <Btn tone="rose" onClick={() => setConfirming("empty")}>
                <Eraser className="size-4" /> Clear workspace
              </Btn>
            )}
          </div>
        </Card>

        <Card id="roadmap" title="90-Day Roadmap" subtitle="The delivery plan for the full product." delay={0.3} className="scroll-mt-4 lg:col-span-2">
          <ol className="grid gap-2 pt-1 sm:grid-cols-2 xl:grid-cols-6">
            {ROADMAP.map((r, i) => {
              const state = ROADMAP_UI[i];
              const Icon = state === "Built" ? CheckCircle2 : state === "Partly built" ? LoaderCircle : Circle;
              return (
                <motion.li key={r.days} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="nx-tile p-3">
                  <div className="flex items-center justify-between text-xs text-fg-3">
                    {r.days}
                    <Icon className={state === "Built" ? "size-4 text-nx-green" : "size-4 text-nx-amber"} />
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

      <Modal open={confirming !== null} onClose={() => setConfirming(null)} title={CONFIRM[confirming ?? "sample"].title} subtitle={CONFIRM[confirming ?? "sample"].subtitle}>
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setConfirming(null)}>
            Cancel
          </Btn>
          <Btn
            tone="rose"
            onClick={() => {
              if (confirming === "empty") clearWorkspace();
              else loadSample();
              toast(CONFIRM[confirming ?? "sample"].done);
              setConfirming(null);
            }}
          >
            {CONFIRM[confirming ?? "sample"].button}
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
