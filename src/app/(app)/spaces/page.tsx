"use client";

import { Copy, LogOut, Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Check3, Modal, Page, Pill, Ring } from "@/components/ui";
import { DAYS } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

type Role = "owner" | "editor" | "viewer";

interface Space {
  id: string;
  name: string;
  role: Role;
  members: { userId: string; name: string; email: string; role: Role; you: boolean }[];
  invites: { id: string; email: string; role: Role; token: string }[];
}

interface Goal {
  title: string;
  milestones: { id: string; title: string; done: boolean }[];
}

interface Event {
  title: string;
  day: number;
  start: number;
  duration: number;
}

type Item = { id: string; kind: "goal"; data: Goal } | { id: string; kind: "event"; data: Event };

const POLL_MS = 15_000;

const fmt = (h: number) => `${Math.floor(h) % 12 || 12}${h % 1 ? `:${String(Math.round((h % 1) * 60)).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong. Please try again.");
  return data as T;
}

function Members({ space, onChange }: { space: Space; onChange: () => void }) {
  const toast = useStore((s) => s.toast);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const owner = space.role === "owner";

  const run = async (work: () => Promise<unknown>, done?: string) => {
    try {
      await work();
      if (done) toast(done);
      onChange();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  const invite = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const { link, emailed } = await api<{ link: string; emailed: boolean }>(`/api/spaces/${space.id}/members`, "POST", { email, role });
      await navigator.clipboard?.writeText(link).catch(() => {});
      toast(emailed ? `Invitation sent to ${email}` : "Invitation link copied. Send it to them.");
      setEmail("");
    });
  };

  return (
    <Card title="Members" subtitle={owner ? "You own this space." : `You're ${space.role === "editor" ? "an editor" : "a viewer"} here.`}>
      <ul className="space-y-1.5">
        {space.members.map((m) => (
          <li key={m.userId} className="nx-tile flex items-center gap-3 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-nx-violet/25 text-sm font-semibold">{m.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">
                {m.name}
                {m.you && <span className="text-fg-3"> (you)</span>}
              </span>
              <span className="block truncate text-xs text-fg-3">{m.email}</span>
            </span>
            {owner && m.role !== "owner" ? (
              <>
                <select
                  aria-label={`Role for ${m.name}`}
                  value={m.role}
                  onChange={(e) => void run(() => api(`/api/spaces/${space.id}/members/${m.userId}`, "PATCH", { role: e.target.value }), "Role updated")}
                  className="nx-input !w-auto !py-1 text-xs"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" aria-label={`Remove ${m.name}`} onClick={() => void run(() => api(`/api/spaces/${space.id}/members/${m.userId}`, "DELETE"), `${m.name} removed`)} className="cursor-pointer text-fg-3 hover:text-nx-rose">
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <Pill className="border-line capitalize text-fg-2">{m.role}</Pill>
            )}
          </li>
        ))}
        {space.invites.map((i) => (
          <li key={i.id} className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-fg-2">
              {i.email} <span className="text-xs text-fg-3">invited as {i.role}</span>
            </span>
            <button
              type="button"
              aria-label={`Copy the invitation link for ${i.email}`}
              onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/spaces/join?token=${i.token}`).then(() => toast("Invitation link copied"))}
              className="cursor-pointer text-fg-3 hover:text-fg"
            >
              <Copy className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      {owner && (
        <form onSubmit={invite} className="mt-3 flex flex-wrap gap-2">
          <input aria-label="Invite by email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="nx-input min-w-0 flex-1" />
          <select aria-label="Their role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="nx-input !w-auto">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <Btn type="submit">
            <UserPlus className="size-4" /> Invite
          </Btn>
        </form>
      )}
    </Card>
  );
}

function Goals({ space, items, onChange }: { space: Space; items: Item[]; onChange: () => void }) {
  const toast = useStore((s) => s.toast);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const canEdit = space.role !== "viewer";
  const goals = items.filter((i): i is Extract<Item, { kind: "goal" }> => i.kind === "goal");

  const save = async (work: () => Promise<unknown>) => {
    try {
      await work();
      onChange();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  return (
    <Card title="Shared goals" subtitle="Everyone in the space sees the same progress.">
      <ul className="space-y-2.5">
        {goals.map((g) => {
          const done = g.data.milestones.filter((m) => m.done).length;
          const pct = g.data.milestones.length ? Math.round((done / g.data.milestones.length) * 100) : 0;
          return (
            <li key={g.id} className="nx-tile p-3">
              <div className="flex items-center gap-3">
                <Ring value={pct} size="2.4rem" stroke={9}>
                  <span className="text-[0.625rem] font-semibold">{pct}%</span>
                </Ring>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.data.title}</span>
                {canEdit && (
                  <button type="button" aria-label={`Delete ${g.data.title}`} onClick={() => void save(() => api(`/api/spaces/${space.id}/items/${g.id}`, "DELETE"))} className="cursor-pointer text-fg-3 hover:text-nx-rose">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <ul className="mt-2 space-y-1">
                {g.data.milestones.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-[0.8125rem]">
                    {canEdit ? (
                      <Check3
                        on={m.done}
                        label={m.title}
                        onChange={() => void save(() => api(`/api/spaces/${space.id}/items/${g.id}`, "PATCH", { milestone: m.id, done: !m.done }))}
                      />
                    ) : (
                      <span className={cn("size-2 rounded-full", m.done ? "bg-nx-green" : "bg-white/20")} />
                    )}
                    <span className={m.done ? "text-fg-3 line-through" : "text-fg"}>{m.title}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {goals.length === 0 && <li className="py-3 text-center text-sm text-fg-3">No shared goals yet.</li>}
      </ul>
      {canEdit && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            const milestones = steps.split("\n").map((t) => t.trim()).filter(Boolean).slice(0, 20).map((t) => ({ id: uid(), title: t, done: false }));
            void save(() => api(`/api/spaces/${space.id}/items`, "POST", { kind: "goal", data: { title, milestones } }));
            setTitle("");
            setSteps("");
          }}
        >
          <input aria-label="Shared goal" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Save for a new car" className="nx-input" />
          <textarea aria-label="Steps, one per line" value={steps} onChange={(e) => setSteps(e.target.value)} rows={2} placeholder={"Steps, one per line\nBook flights"} className="nx-input resize-none" />
          <Btn type="submit" disabled={!title.trim()}>
            <Plus className="size-4" /> Add goal
          </Btn>
        </form>
      )}
    </Card>
  );
}

function Calendar({ space, items, onChange }: { space: Space; items: Item[]; onChange: () => void }) {
  const toast = useStore((s) => s.toast);
  const [draft, setDraft] = useState({ title: "", day: 0, start: 18, duration: 1 });
  const canEdit = space.role !== "viewer";
  const events = items.filter((i): i is Extract<Item, { kind: "event" }> => i.kind === "event").sort((a, b) => a.data.day - b.data.day || a.data.start - b.data.start);

  const save = async (work: () => Promise<unknown>) => {
    try {
      await work();
      onChange();
    } catch (e) {
      toast((e as Error).message, "warn");
    }
  };

  return (
    <Card title="Shared calendar" subtitle="A week everyone in the space can see.">
      <ol className="space-y-2">
        {DAYS.map((day, d) => {
          const today = events.filter((e) => e.data.day === d);
          if (!today.length) return null;
          return (
            <li key={day}>
              <div className="text-xs font-semibold text-fg-3">{day}</div>
              <ul className="mt-1 space-y-1">
                {today.map((e) => (
                  <li key={e.id} className="nx-tile flex items-center gap-3 px-3 py-1.5 text-sm">
                    <span className="w-16 shrink-0 text-xs text-fg-2 tabular-nums">{fmt(e.data.start)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.data.title}</span>
                    {canEdit && (
                      <button type="button" aria-label={`Remove ${e.data.title}`} onClick={() => void save(() => api(`/api/spaces/${space.id}/items/${e.id}`, "DELETE"))} className="cursor-pointer text-fg-3 hover:text-nx-rose">
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
        {events.length === 0 && <li className="py-3 text-center text-sm text-fg-3">Nothing on the shared calendar yet.</li>}
      </ol>
      {canEdit && (
        <form
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            void save(() => api(`/api/spaces/${space.id}/items`, "POST", { kind: "event", data: draft }));
            setDraft({ ...draft, title: "" });
          }}
        >
          <input aria-label="Shared event" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Movie night" className="nx-input col-span-2 sm:col-span-1" />
          <select aria-label="Day" value={draft.day} onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })} className="nx-input">
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <select aria-label="Time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: Number(e.target.value) })} className="nx-input">
            {Array.from({ length: 34 }, (_, i) => 6 + i * 0.5).map((h) => (
              <option key={h} value={h}>
                {fmt(h)}
              </option>
            ))}
          </select>
          <Btn type="submit" disabled={!draft.title.trim()} className="col-span-2 sm:col-span-1">
            <Plus className="size-4" /> Add
          </Btn>
        </form>
      )}
    </Card>
  );
}

export default function SpacesPage() {
  const account = useStore((s) => s.account);
  const toast = useStore((s) => s.toast);
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const space = spaces?.find((s) => s.id === selected) ?? spaces?.[0] ?? null;

  const load = useCallback(async () => {
    if (!account) return;
    const { spaces: list } = await api<{ spaces: Space[] }>("/api/spaces").catch(() => ({ spaces: [] as Space[] }));
    setSpaces(list);
  }, [account]);

  const loadItems = useCallback(async () => {
    if (!space) return setItems([]);
    const { items: list } = await api<{ items: Item[] }>(`/api/spaces/${space.id}/items`).catch(() => ({ items: [] as Item[] }));
    setItems(list);
  }, [space]);

  const refresh = useCallback(() => {
    void load();
    void loadItems();
  }, [load, loadItems]);

  useEffect(() => {
    void load();
  }, [load]);

  // Others in the space make changes too, so the page checks for them while it's open.
  useEffect(() => {
    void loadItems();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [loadItems, refresh]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { id } = await api<{ id: string }>("/api/spaces", "POST", { name });
      setCreating(false);
      setName("");
      setSelected(id);
      await load();
    } catch (err) {
      toast((err as Error).message, "warn");
    }
  };

  const leaveOrDelete = async () => {
    if (!space) return;
    const me = space.members.find((m) => m.you);
    try {
      await (space.role === "owner" ? api(`/api/spaces/${space.id}`, "DELETE") : api(`/api/spaces/${space.id}/members/${me?.userId}`, "DELETE"));
      toast(space.role === "owner" ? `${space.name} deleted` : `You left ${space.name}`, "info");
      setConfirmDelete(false);
      setSelected(null);
      await load();
    } catch (err) {
      toast((err as Error).message, "warn");
    }
  };

  if (!account) {
    return (
      <Page title="Shared Spaces" subtitle="Plan together with family or a team.">
        <Card>
          <p className="py-6 text-center text-sm text-fg-2">Shared spaces need an account, so people can join yours. They aren&apos;t part of this demo.</p>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Shared Spaces"
      subtitle="Plan together with family or a team."
      actions={
        <Btn tone="rose" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New space
        </Btn>
      }
    >
      {spaces && spaces.length === 0 && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <UsersRound className="size-10 text-nx-lilac" strokeWidth={1.4} />
            <p className="max-w-sm text-sm text-fg-2">Share goals and a calendar with family or a team. Everyone gets a role: editors can change things, viewers can look.</p>
            <Btn onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Create your first space
            </Btn>
          </div>
        </Card>
      )}

      {space && (
        <div className="grid gap-3 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <ul className="space-y-2" aria-label="Your spaces">
            {spaces!.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === space.id}
                  onClick={() => setSelected(s.id)}
                  className={cn("nx-card flex w-full cursor-pointer items-center gap-3 p-3 text-left", s.id === space.id && "!border-nx-lilac")}
                >
                  <UsersRound className="size-5 shrink-0 text-nx-lilac" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-fg-3">
                      {s.members.length} {s.members.length === 1 ? "member" : "members"} · {s.role}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <Members space={space} onChange={refresh} />
              <Btn tone="ghost" onClick={() => setConfirmDelete(true)}>
                {space.role === "owner" ? (
                  <>
                    <Trash2 className="size-4" /> Delete space
                  </>
                ) : (
                  <>
                    <LogOut className="size-4" /> Leave space
                  </>
                )}
              </Btn>
            </div>
            <div className="space-y-3">
              {space.role === "viewer" && <p className="text-xs text-fg-3">You can view this space. Ask the owner to make you an editor to change things.</p>}
              <Goals space={space} items={items} onChange={refresh} />
              <Calendar space={space} items={items} onChange={refresh} />
            </div>
          </div>
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New space" subtitle="Name it after the people who'll share it.">
        <form onSubmit={create} className="mt-4 flex gap-2">
          <input autoFocus aria-label="Space name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Family Circle" className="nx-input" />
          <Btn type="submit" disabled={!name.trim()}>
            Create
          </Btn>
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={space?.role === "owner" ? `Delete ${space?.name}?` : `Leave ${space?.name}?`}
        subtitle={space?.role === "owner" ? "This removes its goals and calendar for everyone. It can't be undone." : "You'll lose access until someone invites you again."}
      >
        <div className="mt-5 flex justify-end gap-2">
          <Btn tone="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Btn>
          <Btn tone="rose" onClick={() => void leaveOrDelete()}>
            {space?.role === "owner" ? "Delete space" : "Leave space"}
          </Btn>
        </div>
      </Modal>
    </Page>
  );
}
