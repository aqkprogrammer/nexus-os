"use client";

import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Modal, Segmented } from "@/components/ui";
import { guessCapture, type Capture, type CaptureKind } from "@/lib/capture";
import { DAYS, type LifeArea, type MemoryArea } from "@/lib/data";
import { useStore } from "@/lib/store";
import { cn, isStaticDemo, weekdayIndex } from "@/lib/utils";
import { useDictation } from "@/lib/voice";

type Choice = CaptureKind | "auto";

const CHOICES: { value: Choice; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "task", label: "Task" },
  { value: "memory", label: "Memory" },
  { value: "event", label: "Event" },
  { value: "idea", label: "Idea" },
];

const MEMORY_AREA: Record<LifeArea, MemoryArea> = { Work: "Work", Health: "Health", Family: "People", Learning: "Ideas", Admin: "Home" };

const SAVED: Record<CaptureKind, { text: string; href: string }> = {
  task: { text: "Added to your tasks", href: "/planner#today" },
  memory: { text: "Saved to AI Brain", href: "/brain" },
  event: { text: "Added to your week", href: "/planner#week" },
  idea: { text: "Saved to the Idea Vault", href: "/" },
};

/** Lets AI sort the note when it's on. Otherwise, or if that fails, sorts it with simple rules. */
async function sortNote(text: string): Promise<Capture> {
  if (!isStaticDemo) {
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, today: weekdayIndex() }),
      });
      if (res.ok) return ((await res.json()) as { capture: Capture }).capture;
    } catch {
      // Falls back to the rules below.
    }
  }
  return guessCapture(text);
}

const timeValue = (start: number) => `${String(Math.floor(start)).padStart(2, "0")}:${String(Math.round((start % 1) * 60)).padStart(2, "0")}`;

export function QuickCapture() {
  const open = useStore((s) => s.captureOpen);
  const setUi = useStore((s) => s.setUi);
  const router = useRouter();
  const [text, setText] = useState("");
  const [choice, setChoice] = useState<Choice>("auto");
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("09:00");
  const [busy, setBusy] = useState(false);
  const { listening, dictate } = useDictation((spoken) => setText((t) => (t ? `${t} ${spoken}` : spoken)));

  useEffect(() => {
    if (!open) return;
    setText("");
    setChoice("auto");
    setDay(weekdayIndex());
    setTime("09:00");
  }, [open]);

  // Picking Event fills in any day and time the note already mentions.
  useEffect(() => {
    if (choice !== "event") return;
    const guess = guessCapture(text);
    if (guess.kind !== "event") return;
    setDay(guess.day);
    setTime(timeValue(guess.start));
    // Only when the choice changes, so it never overwrites what the user picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice]);

  const close = () => setUi({ captureOpen: false });

  const save = async () => {
    const note = text.trim();
    if (!note) return;
    setBusy(true);
    const sorted = choice === "auto" ? await sortNote(note) : { ...guessCapture(note), kind: choice };
    if (choice === "event") {
      const [h, m] = time.split(":").map(Number);
      Object.assign(sorted, { day, start: h + m / 60 });
    }
    const title = sorted.title || note;
    const s = useStore.getState();
    if (sorted.kind === "task") s.addPriority(title);
    if (sorted.kind === "memory") s.addMemory({ title, area: MEMORY_AREA[sorted.area], type: "note" });
    if (sorted.kind === "event") s.addEvent({ title, day: sorted.day, start: sorted.start, duration: sorted.duration, area: sorted.area });
    if (sorted.kind === "idea") s.addIdea(title, "Idea");

    const saved = SAVED[sorted.kind];
    const when = sorted.kind === "event" ? ` on ${DAYS[sorted.day]} at ${timeValue(sorted.start)}` : "";
    s.toast(`${saved.text}${when}: ${title}`, "good", { label: "Open", run: () => router.push(saved.href) });
    setBusy(false);
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Quick capture" subtitle="A task, a memory, an event or an idea. Nexus sorts it for you." className="max-w-lg">
      <form
        className="mt-4 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="relative">
          <textarea
            autoFocus
            aria-label="What's on your mind?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="e.g. Call the dentist tomorrow at 3pm"
            maxLength={1000}
            rows={3}
            className="nx-input resize-none pr-11"
          />
          <button
            type="button"
            aria-label="Dictate"
            aria-pressed={listening}
            onClick={dictate}
            className={cn("absolute top-2 right-2 grid size-8 cursor-pointer place-items-center rounded-full hover:bg-white/8", listening ? "animate-pulse text-nx-pink" : "text-fg-2")}
          >
            <Mic className="size-4.5" />
          </button>
        </div>

        <Segmented id="capture-kind" value={choice} options={CHOICES} onChange={setChoice} />

        {choice === "event" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-fg-2">
              Day
              <select value={day} onChange={(e) => setDay(Number(e.target.value))} className="nx-input mt-1.5">
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-fg-2">
              Time
              <input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value || "09:00")} className="nx-input mt-1.5" />
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.6875rem] text-fg-3">Press Enter to save, or C anywhere to open this.</span>
          <Btn type="submit" disabled={busy || !text.trim()}>
            {busy ? "Sorting..." : "Save"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
