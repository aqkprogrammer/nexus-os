// A stand-in for OpenAI's streaming Responses API, so chat tests are free and repeatable.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3299);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createServer(async (req, res) => {
  if (req.url === "/health") return res.end("ok");

  let raw = "";
  for await (const chunk of req) raw += chunk;
  const input = JSON.parse(raw).input ?? [];
  const question = [...input].reverse().find((item) => item.role === "user")?.content ?? "";
  const toolResult = input.some((item) => item.type === "function_call_output");

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
