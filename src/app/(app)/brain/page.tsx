"use client";

import { AnimatePresence, motion } from "motion/react";
import { Paperclip, Pin, Plus, Search, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { Btn, Card, Modal, Page, Pill, Ring, Stat } from "@/components/ui";
import { MEMORY_AREAS, MEMORY_ICONS, type MemoryArea, type MemoryType } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, isStaticDemo, memoryWhen } from "@/lib/utils";
import { saveWorkspace } from "@/lib/workspace-sync";

const NODE_COLORS: Record<MemoryArea, string> = {
  Work: "#a78bfa",
  Health: "#4ade80",
  People: "#f472b6",
  Money: "#fbb024",
  Home: "#60a5fa",
  Ideas: "#f0abfc",
};

function ContextGraph({ active, onPick, counts }: { active: MemoryArea | null; onPick: (a: MemoryArea | null) => void; counts: Record<MemoryArea, number> }) {
  const nodes = MEMORY_AREAS.map((area, i) => {
    const angle = (i / MEMORY_AREAS.length) * Math.PI * 2 - Math.PI / 2;
    return { area, x: Math.round(50 + Math.cos(angle) * 37), y: Math.round(50 + Math.sin(angle) * 37) };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[24rem]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
        <circle cx="50" cy="50" r="37" fill="none" stroke="rgb(170 125 255 / 0.14)" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="rgb(170 125 255 / 0.1)" strokeWidth="0.3" />
        {nodes.map((n) => (
          <line
            key={n.area}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            stroke={NODE_COLORS[n.area]}
            strokeOpacity={active && active !== n.area ? 0.15 : 0.55}
            strokeWidth="0.4"
            className="nx-dash-flow"
            style={{ strokeDasharray: "1.2 1.8" }}
          />
        ))}
      </svg>
      <button
        type="button"
        aria-label="Show all memories"
        onClick={() => onPick(null)}
        className="absolute top-1/2 left-1/2 grid size-[28%] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full"
      >
        <span className="absolute inset-0 animate-glow rounded-full bg-nx-violet/40 blur-xl" />
        <Mascot variant="head" className="relative w-[86%]" />
      </button>
      {nodes.map((n, i) => (
        <motion.button
          key={n.area}
          type="button"
          aria-pressed={active === n.area}
          onClick={() => onPick(active === n.area ? null : n.area)}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
          transition={{ delay: i * 0.06, y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 } }}
          style={{ left: `${n.x}%`, top: `${n.y}%`, x: "-50%", translateY: "-50%" }}
          className={cn(
            "absolute grid size-[4.4rem] cursor-pointer place-items-center rounded-full border bg-[#160c30] text-center leading-tight transition-shadow",
            active === n.area ? "shadow-[0_0_1.2rem_rgb(190_130_255_/_0.65)]" : "hover:shadow-[0_0_1rem_rgb(170_110_255_/_0.4)]",
          )}
        >
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1px solid ${NODE_COLORS[n.area]}` }} />
          <span>
            <span className="block text-base font-semibold">{counts[n.area]}</span>
            <span className="block text-[0.6875rem] text-fg-2">{n.area}</span>
          </span>
        </motion.button>
      ))}
    </div>
  );
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const UPLOAD_TYPES = "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,.md,.csv,.txt";

export default function BrainPage() {
  const memories = useStore((s) => s.memories);
  const addMemory = useStore((s) => s.addMemory);
  const removeMemory = useStore((s) => s.removeMemory);
  const togglePin = useStore((s) => s.togglePin);
  const toast = useStore((s) => s.toast);
  const account = useStore((s) => s.account);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);

  /** Keeps each file and adds a memory from what AI read in it. */
  const upload = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast(`${file.name} is over 4 MB`, "warn");
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        const data = (await res.json()) as { error?: string; fileId: string; read: boolean; memory: { title: string; detail: string; area: MemoryArea; type: MemoryType } };
        if (!res.ok) {
          toast(data.error ?? "Couldn't upload that file", "warn");
          continue;
        }
        addMemory({ ...data.memory, fileId: data.fileId });
        toast(data.read ? `Read and saved: ${data.memory.title}` : `Saved: ${data.memory.title}. Turn on AI to read what's inside.`);
      } catch {
        toast("Couldn't upload that file", "warn");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const [q, setQ] = useState("");
  const [area, setArea] = useState<MemoryArea | null>(null);
  const [type, setType] = useState<MemoryType | "all">("all");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ title: "", detail: "", type: "note" as MemoryType, area: "Work" as MemoryArea });

  const counts = useMemo(() => {
    const c = Object.fromEntries(MEMORY_AREAS.map((a) => [a, 0])) as Record<MemoryArea, number>;
    memories.forEach((m) => (c[m.area] += 1));
    return c;
  }, [memories]);

  // Matches by meaning, best first, when AI is on. Null while unavailable, so the list matches words instead.
  const [meaning, setMeaning] = useState<{ q: string; ids: string[] } | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (isStaticDemo || term.length < 3) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        // Search reads saved memories, so a memory added a moment ago is saved first.
        await saveWorkspace();
        const res = await fetch("/api/memory/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: term }),
          signal: controller.signal,
        });
        if (!res.ok) return setMeaning(null);
        const { matches } = (await res.json()) as { matches: { id: string }[] };
        setMeaning({ q: term, ids: matches.map((m) => m.id) });
      } catch {
        // Aborted by the next keystroke, or offline. Word matching still works.
      }
    }, 350);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const ranked = meaning && meaning.q.toLowerCase() === term ? meaning.ids : [];
    const rank = (id: string) => (ranked.includes(id) ? ranked.indexOf(id) : Infinity);
    return memories
      .filter((m) => (!area || m.area === area) && (type === "all" || m.type === type))
      .filter((m) => !term || rank(m.id) < Infinity || `${m.title} ${m.detail}`.toLowerCase().includes(term))
      .sort((a, b) => (term ? rank(a.id) - rank(b.id) : 0) || Number(!!b.pinned) - Number(!!a.pinned));
  }, [memories, q, area, type, meaning]);
  const byMeaning = !!meaning && meaning.q.toLowerCase() === q.trim().toLowerCase() && meaning.ids.length > 0;

  const coverage = Math.round((MEMORY_AREAS.filter((a) => counts[a] > 0).length / MEMORY_AREAS.length) * 100);

  return (
    <Page
      title="AI Brain"
      subtitle="Persistent context, memory and intelligence."
      actions={
        <div className="flex gap-2">
          {account && (
            <>
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                accept={UPLOAD_TYPES}
                aria-label="Upload files"
                onChange={(e) => {
                  if (e.target.files) void upload(e.target.files);
                  e.target.value = "";
                }}
              />
              <Btn tone="ghost" disabled={uploading > 0} onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" /> {uploading ? "Reading..." : "Upload"}
              </Btn>
            </>
          )}
        <Btn tone="rose" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add memory
        </Btn>
        </div>
      }
    >
      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Memories" value={memories.length} note="Across every life area" />
        <Stat label="Pinned" value={memories.filter((m) => m.pinned).length} note="Always in context" delay={0.05} />
        <Stat label="Promises" value={memories.filter((m) => m.type === "promise").length} note="Things you said you'd do" delay={0.1} />
        <Stat
          label="Context coverage"
          delay={0.15}
          value={
            <span className="flex items-center gap-2">
              {coverage}% <Ring value={coverage} size="1.6rem" stroke={14} />
            </span>
          }
          note="Life areas with memories"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card title="Context Graph" subtitle="Select an area to filter your memories." delay={0.1}>
          <ContextGraph active={area} onPick={setArea} counts={counts} />
        </Card>

        <div
          className="relative grid min-w-0"
          onDragOver={(e) => {
            if (!account || !e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDragging(false)}
          onDrop={(e) => {
            if (!account) return;
            e.preventDefault();
            setDragging(false);
            void upload(e.dataTransfer.files);
          }}
        >
          <Card title="Memory Library" subtitle={`${shown.length} of ${memories.length} memories${byMeaning ? ", best matches by meaning first" : ""}`} delay={0.16}>
            <div className="mb-2.5 flex flex-wrap items-center gap-2">
              <label className="relative min-w-48 flex-1">
                <span className="sr-only">Search memories</span>
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search memories" className="nx-input !pl-9" />
              </label>
              <div className="flex flex-wrap gap-1">
                {(["all", ...Object.keys(MEMORY_ICONS)] as (MemoryType | "all")[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={type === t}
                    onClick={() => setType(t)}
                    className={cn("cursor-pointer rounded-full border px-2.5 py-1 text-xs capitalize transition-colors", type === t ? "border-nx-lilac bg-nx-violet/25 text-white" : "border-line text-fg-3 hover:text-fg")}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <ul className="max-h-[27rem] space-y-1.5 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {shown.map((m) => {
                  const { icon: Icon, color, label } = MEMORY_ICONS[m.type];
                  return (
                    <motion.li key={m.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="nx-tile group flex items-center gap-3 px-3 py-2">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1f` }}>
                        <Icon className="size-4.5" style={{ color }} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{m.title}</span>
                        <span className="block truncate text-xs text-fg-3">{m.detail || label}</span>
                      </span>
                      {m.fileId && (
                        <a href={`/api/uploads/${m.fileId}`} download aria-label={`Download the file for ${m.title}`} className="text-fg-3 hover:text-fg">
                          <Paperclip className="size-4" />
                        </a>
                      )}
                      <Pill className="border-line text-fg-2 max-sm:hidden">{m.area}</Pill>
                      <span className="w-16 shrink-0 text-right text-xs text-fg-3 max-sm:hidden" suppressHydrationWarning>
                        {memoryWhen(m)}
                      </span>
                      <button type="button" aria-label={m.pinned ? `Unpin ${m.title}` : `Pin ${m.title}`} aria-pressed={!!m.pinned} onClick={() => togglePin(m.id)} className="cursor-pointer text-fg-3 hover:text-fg">
                        <Pin className={cn("size-4", m.pinned && "fill-nx-amber text-nx-amber")} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${m.title}`}
                        onClick={() => removeMemory(m.id)}
                        className="cursor-pointer text-fg-3 hover:text-nx-rose"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
              {shown.length === 0 && <li className="py-10 text-center text-sm text-fg-3">No memories match this view.</li>}
            </ul>
          </Card>
          {dragging && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-nx-lilac bg-[#140b2c]/85 text-sm text-fg">
              Drop files to add them to AI Brain
            </div>
          )}
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a memory" subtitle="Nexus uses this as context in every conversation.">
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.title.trim()) return;
            addMemory({ ...draft, title: draft.title.trim(), detail: draft.detail.trim() });
            setDraft({ title: "", detail: "", type: "note", area: "Work" });
            setAdding(false);
            toast("Saved to your AI Brain");
          }}
        >
          <label className="block text-xs text-fg-2">
            What should Nexus remember?
            <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="nx-input mt-1.5" placeholder="Sam prefers calls over email" />
          </label>
          <label className="block text-xs text-fg-2">
            Detail
            <textarea value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} rows={2} className="nx-input mt-1.5 resize-none" placeholder="Optional context" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-fg-2">
              Type
              <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as MemoryType })} className="nx-input mt-1.5">
                {Object.entries(MEMORY_ICONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-fg-2">
              Area
              <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value as MemoryArea })} className="nx-input mt-1.5">
                {MEMORY_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex justify-end">
            <Btn type="submit" disabled={!draft.title.trim()}>
              Save memory
            </Btn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
