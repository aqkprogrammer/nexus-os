"use client";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type PushState = "unsupported" | "unconfigured" | "denied" | "off" | "on";

const supported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** Registers the service worker that shows notifications and makes the app installable. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {
    // The app works without it. Only notifications and installing need it.
  });
}

async function subscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return "unsupported";
  if (!PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  return (await subscription()) ? "on" : "off";
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

export async function enablePush(): Promise<PushState> {
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const sub = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  if (!res.ok) {
    await sub.unsubscribe();
    throw new Error("Couldn't turn on push notifications.");
  }
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const sub = await subscription();
  if (sub) {
    await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
  return "off";
}

/** Alerts the user's other devices. This one already shows the notice in the app. */
export async function notifyOtherDevices(message: { title: string; body: string; url: string }) {
  if (!supported() || !PUBLIC_KEY) return;
  const own = await subscription().catch(() => null);
  await fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, skip: own?.endpoint }),
  }).catch(() => {
    // A missed alert isn't worth interrupting the user for. The notice is still in the app.
  });
}
