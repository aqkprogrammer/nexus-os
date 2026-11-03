// A stand-in for OpenAI's streaming Responses API, so chat tests are free and repeatable.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3299);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pushes = new Map();
const emails = new Map();

/** Words that mean the same thing share a slot, so the mock can tell "beverage" matches "tea". */
const SYNONYMS = { beverage: "drink", tea: "drink", coffee: "drink", physician: "doctor", gp: "doctor", knee: "leg" };

/** A bag-of-words vector, normalised, standing in for a real embedding. */
function embed(text) {
  const v = new Array(1536).fill(0);
  for (const raw of String(text).toLowerCase().match(/[a-z]+/g) ?? []) {
    const word = SYNONYMS[raw] ?? raw;
    if (word.length < 3) continue;
    let h = 0;
    for (const c of word) h = (h * 31 + c.charCodeAt(0)) % 1536;
    v[h] += 1;
  }
  const norm = Math.hypot(...v) || 1;
  return v.map((x) => x / norm);
}

/** Canned answers for each structured request, keyed by its schema name. */
const STRUCTURED = {
  // Reads images and PDFs. Text files fail on purpose, to check the file is still kept.
  file_facts: (content) =>
    JSON.stringify(content).includes("input_text\",\"text\":\"File name: notes")
      ? null
      : { title: "Receipt - Costco", summary: "$184.20 on household supplies, paid on 2 Nov.", area: "Money" },
  agent_result: (task) =>
    /fail/i.test(task)
      ? null
      : {
          title: task.slice(0, 40),
          summary: "I drafted a plan from your calendar and priorities. Approve it to keep it.",
          output: "Monday: deep work on the agent engine\nTuesday: product review",
          impact: "Keeps the week on track",
          priority: "High",
        },
  goal_plan: () => ({
    milestones: ["Pick a training plan", "Run three times a week", "Complete a 10 km run", "Race day"],
    insight: "Your Saturday mornings are free, which suits the long runs.",
  }),
  capture: (text) =>
    /dentist/i.test(text)
      ? { kind: "event", title: "Dentist", area: "Health", day: 2, start: 15, duration: 1 }
      : { kind: "task", title: text, area: "Work", day: 0, start: 9, duration: 1 },
};

createServer(async (req, res) => {
  if (req.url === "/health") return res.end("ok");

  // A stand-in for Stripe's API: customers, Checkout and the billing portal.
  if (req.url.startsWith("/v1/customers") || req.url.startsWith("/v1/checkout/") || req.url.startsWith("/v1/billing_portal/")) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const form = new URLSearchParams(raw);
    const id = `${req.url.split("/")[2]}_${Math.random().toString(36).slice(2, 10)}`;
    const body = req.url.startsWith("/v1/customers")
      ? { id: `cus_${id}`, object: "customer", email: form.get("email") }
      : req.url.startsWith("/v1/checkout/")
        ? { id: `cs_${id}`, object: "checkout.session", url: `https://checkout.stripe.test/${form.get("customer")}?price=${form.get("line_items[0][price]")}` }
        : { id: `bps_${id}`, object: "billing_portal.session", url: `https://billing.stripe.test/${form.get("customer")}` };
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(body));
  }

  // A stand-in for Google Calendar and Gmail. Only the token the tests store is accepted.
  if (req.url.startsWith("/google/")) {
    const json = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== "Bearer test-google-token") return json(401, { error: "invalid_token" });
    const url = new URL(req.url, "http://mock");
    if (url.pathname.endsWith("/calendars/primary/events")) {
      const monday = new Date(url.searchParams.get("timeMin"));
      const at = (days, hours) => new Date(monday.getTime() + days * 86_400_000 + hours * 3_600_000).toISOString();
      return json(200, {
        items: [
          { id: "g1", summary: "Team offsite", status: "confirmed", start: { dateTime: at(2, 10) }, end: { dateTime: at(2, 11.5) } },
          { id: "g2", summary: "Public holiday", status: "confirmed", start: { date: "2026-01-01" }, end: { date: "2026-01-02" } },
        ],
      });
    }
    if (url.pathname.endsWith("/users/me/messages")) return json(200, { messages: [{ id: "m1" }, { id: "m2" }] });
    const id = url.pathname.split("/").pop();
    const mail = {
      m1: { from: "Ana Ruiz <ana@example.com>", subject: "Contract signed" },
      m2: { from: '"Your Bank" <no-reply@bank.example>', subject: "Statement ready" },
    }[id];
    if (!mail) return json(404, {});
    return json(200, { id, snippet: "Preview text", internalDate: String(Date.now()), payload: { headers: [{ name: "From", value: mail.from }, { name: "Subject", value: mail.subject }] } });
  }

  // A stand-in for Resend: it keeps every email, and the tests read them back by recipient.
  if (req.url.startsWith("/resend/emails")) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const email = JSON.parse(raw);
    emails.set(email.to, [...(emails.get(email.to) ?? []), email]);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ id: `email_${emails.size}` }));
  }
  if (req.url.startsWith("/email-log/")) {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(emails.get(decodeURIComponent(req.url.slice(11))) ?? []));
  }

  // A stand-in push service: it records each delivery, and "gone" acts like a device that unsubscribed.
  if (req.url.startsWith("/push-log/")) return res.end(String(pushes.get(req.url.slice(10)) ?? 0));
  if (req.url.startsWith("/push/")) {
    for await (const _ of req);
    const id = req.url.slice(6);
    if (id.startsWith("gone")) {
      res.writeHead(410);
      return res.end();
    }
    pushes.set(id, (pushes.get(id) ?? 0) + 1);
    res.writeHead(201);
    return res.end();
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);

  if (req.url.endsWith("/embeddings")) {
    const texts = Array.isArray(body.input) ? body.input : [body.input];
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ object: "list", model: body.model, data: texts.map((t, index) => ({ object: "embedding", index, embedding: embed(t) })) }));
  }
  const input = typeof body.input === "string" ? [{ role: "user", content: body.input }] : (body.input ?? []);
  const question = [...input].reverse().find((item) => item.role === "user")?.content ?? "";
  const toolResult = input.some((item) => item.type === "function_call_output");

  // Structured answers come back whole, as JSON in a single message.
  const format = body.text?.format?.name;
  if (format) {
    const answer = STRUCTURED[format]?.(question);
    if (!answer) {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { message: `No mock for ${format}` } }));
    }
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(
      JSON.stringify({
        id: "r",
        object: "response",
        created_at: 0,
        status: "completed",
        model: "mock",
        output: [{ type: "message", id: "m", role: "assistant", status: "completed", content: [{ type: "output_text", text: JSON.stringify(answer), annotations: [] }] }],
      }),
    );
  }

  if (question.includes("server error")) {
    res.writeHead(400, { "content-type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "Mock failure" } }));
  }

  res.writeHead(200, { "content-type": "text/event-stream" });
  const send = (data) => res.write(`event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`);
  const words = async (list, delay = 20) => {
    for (const delta of list) {
      send({ type: "response.output_text.delta", delta, item_id: "m", output_index: 0, content_index: 0, sequence_number: 1 });
      await sleep(delay);
    }
  };
  const finish = () => {
    send({ type: "response.completed", sequence_number: 9, response: { id: "r", output: [] } });
    res.end();
  };

  if (toolResult) {
    await words(["Added ", "it ", "to ", "your ", "list."]);
    return finish();
  }
  if (question.includes("add a task")) {
    send({
      type: "response.output_item.done",
      output_index: 0,
      sequence_number: 2,
      item: { type: "function_call", id: "fc_1", call_id: "call_1", name: "add_task", arguments: '{"title":"Book flights"}', status: "completed" },
    });
    return finish();
  }
  if (question.includes("long reply")) {
    await words(Array.from({ length: 200 }, (_, i) => `word${i} `), 30);
    return finish();
  }
  await words(["Hello ", "from ", "the ", "real ", "chat ", "pipeline."]);
  finish();
}).listen(port, "127.0.0.1");
