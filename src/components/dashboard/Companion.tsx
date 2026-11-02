"use client";

import { AnimatePresence, motion } from "motion/react";
import { Activity, CalendarDays, Ellipsis, Expand, Goal, Mic, Minimize2, RotateCcw, SendHorizontal, Square, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mascot } from "@/components/Mascot";
import { enter } from "@/components/ui";
import { isStaticDemo, retryChat, sendChat, stopChat } from "@/lib/chat-client";
import { useStore, type ChatMessage } from "@/lib/store";
import { cn } from "@/lib/utils";

const CHIPS = [
  { label: "What's on my agenda?", icon: CalendarDays, color: "#c4a5ff" },
  { label: "Show my top priorities", icon: Star, color: "#fbb024" },
  { label: "Any progress updates?", icon: Activity, color: "#34d399" },
  { label: "Which goal needs me?", icon: Goal, color: "#f472b6" },
];

const GREETINGS = {
  Warm: (name: string) => `Hello, ${name}! ☀️ I've organized your day, reviewed what matters, and found a few opportunities for you.`,
  Direct: (name: string) => `${name}, your day is organized. Priorities are set and opportunities are flagged.`,
  Playful: (name: string) => `Hey ${name}! 🎉 Your day is sorted, your to-dos are behaving, and I found a few nice surprises.`,
};

function Bubble({ m }: { m: ChatMessage }) {
  const mine = m.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", mine ? "justify-end" : "items-end gap-1.5")}>
      {!mine && <Mascot variant="head" className="w-9 shrink-0" />}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl border px-3.5 py-2.5 text-[0.8125rem] leading-5 whitespace-pre-line",
          mine ? "rounded-br-sm border-nx-violet/60 bg-nx-violet/25 text-white" : "rounded-bl-sm border-line bg-white/4 text-fg",
          m.failed && "border-nx-rose/50",
        )}
      >
        {m.text}
        {m.link && (
          <Link href={m.link.href} className="mt-1.5 block text-xs font-medium text-nx-lilac hover:underline">
            {m.link.label} →
          </Link>
        )}
        {m.failed && (
          <button type="button" onClick={() => retryChat(m.id)} className="mt-1.5 flex cursor-pointer items-center gap-1 text-xs font-medium text-nx-lilac hover:underline">
            <RotateCcw className="size-3" /> Try again
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ChatBody({ expanded }: { expanded: boolean }) {
  const chat = useStore((s) => s.chat);
  const status = useStore((s) => s.chatStatus);
  const mode = useStore((s) => s.chatMode);
  const clearChat = useStore((s) => s.clearChat);
  const setUi = useStore((s) => s.setUi);
  const toast = useStore((s) => s.toast);
  const name = useStore((s) => s.profile.name);
  const tone = useStore((s) => s.profile.companionTone);
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [listening, setListening] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const busy = status !== "idle";
  const demo = isStaticDemo || mode === "demo";
  const lastLength = chat[chat.length - 1]?.text.length ?? 0;

  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat.length, lastLength, status]);

  const send = (value: string) => {
    if (!value.trim() || busy) return;
    setText("");
    void sendChat(value);
  };

  const dictate = () => {
    type SR = { lang: string; onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void; onend: () => void; start: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      toast("Voice input isn't supported in this browser", "warn");
      return;
    }
    const sr = new Ctor();
    sr.lang = "en-US";
    sr.onresult = (e) => setText(e.results[0][0].transcript);
    sr.onend = () => setListening(false);
    setListening(true);
    sr.start();
  };

  return (
    <>
      <header className="flex items-center gap-2.5 border-b border-line/70 px-3.5 py-2.5">
        <Mascot variant="head" className="w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="nx-wordmark text-lg leading-6 font-semibold">
            <i>Nexus</i> OS
          </div>
          <div className="text-[0.6875rem] text-fg-2" title={demo ? "Replies come from built-in rules. Connect an OpenAI key for real AI." : undefined}>
            {demo ? "Demo replies" : "Your AI Companion"}
          </div>
        </div>
        <div className="relative">
          <button type="button" aria-label="Conversation options" aria-expanded={menu} onClick={() => setMenu(!menu)} className="grid size-8 cursor-pointer place-items-center rounded-md text-fg-2 hover:bg-white/8 hover:text-fg">
            <Ellipsis className="size-4.5" />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 z-20 w-40 rounded-lg border border-line bg-[#1c1138] p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => {
                    stopChat();
                    clearChat();
                    setMenu(false);
                  }}
                  className="flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-fg-2 hover:bg-white/8"
                >
                  <Trash2 className="size-3.5" /> Clear conversation
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          aria-label={expanded ? "Shrink chat" : "Expand chat"}
          onClick={() => setUi({ chatExpanded: !expanded })}
          className="grid size-8 cursor-pointer place-items-center rounded-md text-fg-2 hover:bg-white/8 hover:text-fg"
        >
          {expanded ? <Minimize2 className="size-4" /> : <Expand className="size-4" />}
        </button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex items-end gap-1.5">
          <Mascot variant="head" className="w-9 shrink-0" />
          <div className="rounded-2xl rounded-bl-sm border border-line bg-white/4 px-3.5 py-2.5 text-[0.8125rem] leading-5 text-fg">
            {GREETINGS[tone](name)}
            <br />
            <br />
            Shall we get started?
          </div>
        </motion.div>

        {chat.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}

        {status === "thinking" && (
          <div className="flex items-end gap-1.5">
            <Mascot variant="head" className="w-9 shrink-0" />
            <div className="flex gap-1 rounded-2xl rounded-bl-sm border border-line bg-white/4 px-3.5 py-3" aria-label="Nexus is typing">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="size-1.5 rounded-full bg-nx-lilac" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }} />
              ))}
            </div>
          </div>
        )}

        {chat.length === 0 && !busy && (
          <ul className="ml-10 space-y-2">
            {CHIPS.map((c, i) => (
              <motion.li key={c.label} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.08 }}>
                <button
                  type="button"
                  onClick={() => send(c.label)}
                  className="flex h-8.5 cursor-pointer items-center gap-2.5 rounded-full border border-line bg-white/3 px-3.5 text-xs text-fg-2 transition-all hover:translate-x-1 hover:border-nx-lilac hover:text-fg"
                >
                  <c.icon className="size-4" style={{ color: c.color }} strokeWidth={1.8} />
                  {c.label}
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <form
        className="px-3 pb-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <div className="flex h-12 items-center gap-2 rounded-full border border-[#a06bff] bg-[#1a0f38] pr-1.5 pl-4 shadow-[0_0_1rem_rgb(139_92_246_/_0.35)] transition-shadow focus-within:shadow-[0_0_1.4rem_rgb(190_120_255_/_0.6)]">
          <input aria-label="Ask Nexus anything" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask anything..." maxLength={2000} className="min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-fg-3" />
          <button type="button" aria-label="Dictate" aria-pressed={listening} onClick={dictate} className={cn("grid size-8 cursor-pointer place-items-center rounded-full hover:bg-white/8", listening ? "animate-pulse text-nx-pink" : "text-fg-2")}>
            <Mic className="size-4.5" />
          </button>
          {busy ? (
            <button type="button" aria-label="Stop reply" onClick={stopChat} className="grid size-9.5 cursor-pointer place-items-center rounded-full border border-nx-pink/60 bg-nx-pink/15 text-[#ff9fdc] transition-colors hover:bg-nx-pink/30">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" aria-label="Send" disabled={!text.trim()} className="grid size-9.5 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-[#ff7fd0] to-[#d13ad8] text-white shadow-[0_0_0.8rem_rgb(236_75_184_/_0.6)] transition-transform hover:scale-105 disabled:cursor-default disabled:opacity-70">
              <SendHorizontal className="size-4.5" />
            </button>
          )}
        </div>
      </form>
    </>
  );
}

export function Companion() {
  const expanded = useStore((s) => s.chatExpanded);
  const setUi = useStore((s) => s.setUi);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setUi({ chatExpanded: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, setUi]);

  return (
    <>
      <motion.section {...enter(0.3)} aria-label="Nexus companion" className="nx-card flex min-h-0 flex-col">
        {!expanded && <ChatBody expanded={false} />}
      </motion.section>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div className="fixed inset-0 z-50 grid place-items-center bg-[#05020d]/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div
                  initial={{ scale: 0.95, y: 16 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.97, y: 8 }}
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  className="nx-card flex h-[85vh] w-full max-w-3xl flex-col bg-[#120a28]"
                >
                  <ChatBody expanded />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
