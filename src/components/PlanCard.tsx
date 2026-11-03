"use client";

import { Crown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Bar, Btn, Card, Pill } from "@/components/ui";
import { useStore } from "@/lib/store";

interface Billing {
  configured: boolean;
  plan?: "free" | "pro";
  used?: number;
  limit?: number;
  status?: string;
  renews?: string | null;
  price?: string | null;
}

/** Sends the user to a page Stripe hosts, for paying or for managing billing. */
async function goTo(path: string) {
  const res = await fetch(path, { method: "POST" });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't reach Stripe. Try again.");
  window.location.assign(data.url);
}

/** A signed-in account's real plan, with upgrade and billing through Stripe when it's set up. */
export function PlanCard() {
  const memories = useStore((s) => s.memories.length);
  const toast = useStore((s) => s.toast);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/billing", { cache: "no-store" });
    if (res.ok) setBilling((await res.json()) as Billing);
  }, []);

  useEffect(() => {
    void load();
    // Back from Stripe Checkout. The webhook may land a moment later, so this checks again briefly.
    if (!new URLSearchParams(window.location.search).has("billing")) return;
    toast("Thanks! Your upgrade is being confirmed.");
    const timers = [2000, 5000, 10000].map((ms) => setTimeout(() => void load(), ms));
    return () => timers.forEach(clearTimeout);
  }, [load, toast]);

  const act = (path: string) => async () => {
    setBusy(true);
    try {
      await goTo(path);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't reach Stripe. Try again.", "warn");
      setBusy(false);
    }
  };

  const pro = billing?.plan === "pro";
  const pastDue = billing?.status === "past_due";

  return (
    <Card id="plan" title="Plan & Storage" delay={0.15} className="scroll-mt-4">
      <div className="flex items-center gap-3 pt-1">
        <Crown className="size-8 fill-nx-amber/30 text-nx-amber" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            {!billing?.configured ? "Early access" : pro ? "Nexus Pro" : "Free"}
            {pastDue && <Pill className="border-nx-rose/40 text-nx-rose">Payment due</Pill>}
          </div>
          <div className="text-xs text-fg-3">
            {!billing?.configured
              ? "Free while NEXUS OS is in early access"
              : pro && billing.renews
                ? `Renews ${new Date(billing.renews).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : `More AI every day with Pro${billing.price ? `, ${billing.price}` : ""}`}
          </div>
        </div>
        {billing?.configured &&
          (pro ? (
            <Btn size="sm" tone="ghost" disabled={busy} onClick={act("/api/billing/portal")}>
              Manage billing
            </Btn>
          ) : (
            <Btn size="sm" disabled={busy} onClick={act("/api/billing/checkout")}>
              Upgrade to Pro
            </Btn>
          ))}
      </div>
      {billing?.configured && billing.limit !== undefined && (
        <>
          <div className="mt-4 flex justify-between text-xs text-fg-2">
            <span>AI today</span>
            <span>
              {Math.min(billing.used ?? 0, billing.limit)} of {billing.limit} requests
            </span>
          </div>
          <Bar value={Math.min(100, ((billing.used ?? 0) / billing.limit) * 100)} className="mt-1.5" />
        </>
      )}
      <div className="mt-3 flex justify-between text-xs text-fg-2">
        <span>AI Memory</span>
        <span>
          {memories} {memories === 1 ? "memory" : "memories"} saved
        </span>
      </div>
    </Card>
  );
}
