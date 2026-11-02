import { buildContext } from "./chat-context";
import type { ChatEvent, ChatToolCall } from "./chat-tools";
import { companionReply } from "./companion";
import { useStore, type ChatMessage } from "./store";
import { uid, weekdayIndex } from "./utils";

const MAX_HISTORY = 20;
const MAX_INPUT_CHARS = 2000;

/** The GitHub Pages build has no server, so it always uses the built-in demo replies. */
export const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

let controller: AbortController | null = null;

class ChatError extends Error {}

function applyTool(call: ChatToolCall): ChatMessage["link"] {
  const s = useStore.getState();
  switch (call.name) {
    case "add_task":
      s.addPriority(call.args.title);
      return { label: "Open planner", href: "/planner#today" };
    case "save_memory":
      s.addMemory(call.args);
      return { label: "Open AI Brain", href: "/brain" };
    case "add_event":
      s.addEvent(call.args);
      return { label: "See your week", href: "/planner#week" };
    case "create_goal":
      s.addGoal(call.args.title, call.args.area, call.args.timeframe);
      return { label: "Open the plan", href: "/goals" };
    case "launch_agent":
      s.launchAgent(call.args.agent, call.args.task);
      return { label: "Watch it work", href: "/agents#activity" };
  }
}

/** Returns false when no model is configured, so the caller can use the demo replies. */
async function streamLive(signal: AbortSignal, onText: (delta: string) => void, onTool: (call: ChatToolCall) => void) {
  const s = useStore.getState();
  const messages = s.chat
    .filter((m) => !m.failed && m.text)
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_INPUT_CHARS) }));

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context: buildContext(s) }),
    signal,
  });

  if (res.status === 503 || res.status === 404) return false;
  if (res.status === 429) throw new ChatError("You're sending messages quickly. Give me a moment and try again.");
  if (!res.ok || !res.body) throw new ChatError("I couldn't reach the AI service.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handle = (line: string) => {
    const event = JSON.parse(line) as ChatEvent;
    if (event.type === "text") onText(event.delta);
    if (event.type === "tool") onTool(event.call);
    if (event.type === "error") throw new ChatError(event.message);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let end: number;
    while ((end = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 1);
      if (line) handle(line);
    }
  }
  return true;
}

async function streamDemo(input: string, signal: AbortSignal, onText: (delta: string) => void) {
  await new Promise((r) => setTimeout(r, 650));
  const reply = companionReply(input, useStore.getState(), weekdayIndex());
  for (const word of reply.text.split(/(\s+)/)) {
    if (signal.aborted) break;
    onText(word);
    await new Promise((r) => setTimeout(r, 30));
  }
  return reply.link;
}

export async function sendChat(value: string) {
  const input = value.trim().slice(0, MAX_INPUT_CHARS);
  const store = useStore.getState();
  if (!input || store.chatStatus !== "idle") return;

  store.pushChat({ id: uid(), role: "user", text: input });
  store.setUi({ chatStatus: "thinking" });

  const current = new AbortController();
  controller = current;
  const id = uid();
  let started = false;
  let link: ChatMessage["link"];

  const write = (delta: string) => {
    const s = useStore.getState();
    if (started) {
      s.appendChat(id, delta);
      return;
    }
    started = true;
    s.pushChat({ id, role: "assistant", text: delta });
    s.setUi({ chatStatus: "streaming" });
  };

  try {
    const live = !isStaticDemo && (await streamLive(current.signal, write, (call) => (link = applyTool(call))));
    useStore.getState().setUi({ chatMode: live ? "live" : "demo" });
    if (!live) link = await streamDemo(input, current.signal, write);
    if (!started && !current.signal.aborted) write("Done.");
    if (link) useStore.getState().patchChat(id, { link });
  } catch (error) {
    if (!current.signal.aborted) {
      const text = error instanceof ChatError ? error.message : "Something went wrong with that reply.";
      useStore.getState().pushChat({ id: started ? uid() : id, role: "assistant", text, failed: true });
    }
  } finally {
    controller = null;
    useStore.getState().setUi({ chatStatus: "idle" });
  }
}

export function stopChat() {
  controller?.abort();
}

/** Removes the failed reply and its question, then asks again. */
export function retryChat(failedId: string) {
  const { chat, removeChat } = useStore.getState();
  const at = chat.findIndex((m) => m.id === failedId);
  const question = chat.slice(0, at).findLast((m) => m.role === "user");
  if (!question) return;
  removeChat([failedId, question.id]);
  void sendChat(question.text);
}
