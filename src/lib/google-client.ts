"use client";

import { shiftDays, startOfWeek } from "./activity";
import type { CalEvent } from "./data";
import { useStore } from "./store";

export interface Mail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
}

export interface GoogleState {
  /** False when this server has no Google sign-in set up. */
  configured: boolean;
  connected: boolean;
  events: CalEvent[];
  mail: Mail[];
}

const REFRESH_MS = 5 * 60_000;
export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/gmail.readonly"];

/** A Google event as a planner block on this week's grid. All-day events are left out of the hourly grid. */
function toBlock(e: { id: string; title: string; start: string; end: string; allDay: boolean }, weekStart: number): CalEvent | null {
  if (e.allDay) return null;
  const start = new Date(e.start);
  const end = new Date(e.end);
  const day = Math.floor((start.getTime() - weekStart) / 86_400_000);
  if (day < 0 || day > 6) return null;
  const hours = start.getHours() + start.getMinutes() / 60;
  return { id: `google:${e.id}`, title: e.title, day, start: hours, duration: Math.max(0.25, (end.getTime() - start.getTime()) / 3_600_000), area: "Work", external: "google" };
}

async function load() {
  const status = await fetch("/api/google", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<{ configured: boolean; connected: boolean }>) : null));
  if (!status) return;
  if (!status.connected) {
    useStore.setState({ google: { ...status, events: [], mail: [] } });
    return;
  }

  const weekStart = startOfWeek(Date.now());
  const range = new URLSearchParams({ from: new Date(weekStart).toISOString(), to: new Date(shiftDays(weekStart, 7)).toISOString() });
  const [calendar, gmail] = await Promise.all([
    fetch(`/api/google/calendar?${range}`).then((r) => (r.ok ? r.json() : { events: [] })),
    fetch("/api/google/gmail").then((r) => (r.ok ? r.json() : { mail: [] })),
  ]);
  const events = (calendar.events as Parameters<typeof toBlock>[0][]).map((e) => toBlock(e, weekStart)).filter((e): e is CalEvent => !!e);
  useStore.setState({ google: { ...status, events, mail: gmail.mail as Mail[] } });
}

/** Keeps Google Calendar and Gmail fresh while the app is open. */
export function startGoogleSync() {
  void load().catch(() => {});
  const timer = setInterval(() => void load().catch(() => {}), REFRESH_MS);
  return () => clearInterval(timer);
}

export const refreshGoogle = () => load().catch(() => {});
