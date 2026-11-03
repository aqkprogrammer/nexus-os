"use client";

import { dayKey, startOfDay } from "./activity";
import { useStore } from "./store";
import { weekdayIndex } from "./utils";

const CHECK_MS = 15_000;
/** A reminder still fires if the app was asleep for a moment, but not once the event is well underway. */
const GRACE_MS = 5 * 60_000;
const FIRED_KEY = "nexus-reminders";

export const REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60];

export const reminderLabel = (minutes: number) => (minutes ? `${minutes} min before` : "No reminder");

function firedToday(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(FIRED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function remember(fired: Set<string>) {
  try {
    sessionStorage.setItem(FIRED_KEY, JSON.stringify([...fired].slice(-200)));
  } catch {
    // Without storage a reminder may repeat after a reload, which is better than missing it.
  }
}

/** Shows a system notification too, when the user has allowed them. */
function systemNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    // Some mobile browsers only allow notifications from a service worker.
  }
}

/** Checks today's events for due reminders while the app is open, and starts a new day when the date changes. */
export function startReminders() {
  let today = dayKey(Date.now());
  const fired = firedToday();

  const check = () => {
    const now = Date.now();
    const store = useStore.getState();
    if (dayKey(now) !== today) {
      today = dayKey(now);
      store.startWeek();
      store.startDay();
    }

    const weekday = weekdayIndex(new Date(now));
    for (const e of store.events) {
      if (!e.remind || e.day !== weekday) continue;
      const startsAt = startOfDay(now) + e.start * 3_600_000;
      const remindAt = startsAt - e.remind * 60_000;
      const key = `${e.id}:${today}:${e.start}`;
      if (now < remindAt || now > remindAt + GRACE_MS || fired.has(key)) continue;

      fired.add(key);
      remember(fired);
      const minutes = Math.max(0, Math.round((startsAt - now) / 60_000));
      const title = minutes ? `${e.title} starts in ${minutes} min` : `${e.title} is starting`;
      store.notify({ title, detail: "From your Life Planner.", href: "/planner#week" });
      systemNotification(title, "From your Life Planner.");
    }
  };

  check();
  const timer = setInterval(check, CHECK_MS);
  return () => clearInterval(timer);
}
