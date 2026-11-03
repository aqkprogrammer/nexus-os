import OpenAI from "openai";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { currentUser } from "./auth";
import { AI_LIMIT_REACHED, spendAi } from "./billing";
import { rateLimited } from "./rate-limit";
import { sameOrigin } from "./request";

export const MODEL = process.env.OPENAI_MODEL || "gpt-6-astra";

/** The rules every AI endpoint shares: same site, signed in, configured, and not called too often. */
export async function aiRequest(req: Request, bucket: string, limit: number, counted = true) {
  if (!sameOrigin(req)) return { error: Response.json({ error: "forbidden" }, { status: 403 }) };
  const user = await currentUser(req);
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  if (!process.env.OPENAI_API_KEY) return { error: Response.json({ error: "not_configured" }, { status: 503 }) };
  if (rateLimited(`${bucket}:${user.id}`, limit)) return { error: Response.json({ error: "rate_limited" }, { status: 429 }) };
  if (counted && !(await spendAi(user.id))) return { error: Response.json({ error: AI_LIMIT_REACHED }, { status: 402 }) };
  return { user };
}

/** Asks the model for JSON that matches `schema`. Strict mode means every field is always present. */
export async function askJson<T>(name: string, schema: Record<string, unknown>, instructions: string, input: string | ResponseInputItem[], maxTokens = 800) {
  const response = await new OpenAI().responses.create({
    model: MODEL,
    instructions,
    input,
    store: false,
    max_output_tokens: maxTokens,
    text: { format: { type: "json_schema", name, schema, strict: true } },
  });
  return JSON.parse(response.output_text) as T;
}
