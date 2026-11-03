import { savedState, useStore, type Store } from "./store";

const ENDPOINT = "/api/workspace";
const SAVE_DELAY_MS = 500;
const RETRY_DELAY_MS = 5000;
/** Browsers refuse larger bodies on a request that has to outlive the page. */
const KEEPALIVE_LIMIT = 60_000;

let version = 0;
let lastSaved = "";
let saving = false;
let warned = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const snapshot = () => JSON.stringify(savedState(useStore.getState()));

const toSignIn = () => window.location.replace("/login");

function later(ms: number) {
  clearTimeout(timer);
  timer = setTimeout(() => void saveWorkspace(), ms);
}

function apply(state: Partial<Store>, next: number) {
  useStore.setState(state);
  version = next;
  lastSaved = snapshot();
}

/** Returns false when the visitor is being sent to sign in. Throws if the workspace can't be read. */
export async function loadWorkspace() {
  const res = await fetch(ENDPOINT, { cache: "no-store" });
  if (res.status === 401) {
    toSignIn();
    return false;
  }
  if (!res.ok) throw new Error(`Workspace request failed: ${res.status}`);

  const saved = (await res.json()) as { account: NonNullable<Store["account"]>; state: Partial<Store> | null; version: number };
  useStore.setState({ account: saved.account });
  if (saved.state) apply(saved.state, saved.version);
  else useStore.getState().setProfile({ name: saved.account.name });
  return true;
}

export async function saveWorkspace(keepalive = false) {
  clearTimeout(timer);
  const body = snapshot();
  if (saving || body === lastSaved) return;

  saving = true;
  try {
    const res = await fetch(ENDPOINT, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: `{"state":${body},"version":${version}}`,
      keepalive: keepalive && body.length < KEEPALIVE_LIMIT,
    });
    if (res.status === 401) return toSignIn();
    if (res.status !== 200 && res.status !== 409) throw new Error(`Workspace save failed: ${res.status}`);

    const result = (await res.json()) as { state?: Partial<Store> | null; version: number };
    if (res.status === 409 && result.state) {
      apply(result.state, result.version);
      useStore.getState().toast("Your workspace changed somewhere else, so your last edit was replaced.", "warn");
    } else {
      version = result.version;
      if (res.status === 200) lastSaved = body;
    }
    warned = false;
    if (snapshot() !== lastSaved) later(SAVE_DELAY_MS);
  } catch {
    if (!warned) useStore.getState().toast("Couldn't save your latest changes. Retrying...", "warn");
    warned = true;
    later(RETRY_DELAY_MS);
  } finally {
    saving = false;
  }
}

/** Picks up changes from another tab or device, unless this one has edits still to save. */
async function refresh() {
  if (saving || snapshot() !== lastSaved) return;
  const res = await fetch(ENDPOINT, { cache: "no-store" });
  if (!res.ok) return;
  const saved = (await res.json()) as { state: Partial<Store> | null; version: number };
  if (saved.state && saved.version > version && snapshot() === lastSaved) apply(saved.state, saved.version);
}

export function startSync() {
  const unsubscribe = useStore.subscribe(() => later(SAVE_DELAY_MS));
  const onVisibility = () => void (document.visibilityState === "hidden" ? saveWorkspace(true) : refresh());
  const onPageHide = () => void saveWorkspace(true);

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  later(SAVE_DELAY_MS);

  return () => {
    unsubscribe();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
  };
}
