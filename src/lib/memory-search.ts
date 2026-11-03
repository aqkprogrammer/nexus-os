import OpenAI from "openai";
import { prisma } from "./db";

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
/** Fixed by the vector(1536) column. A model with another size needs a new migration. */
const DIMENSIONS = 1536;
const MAX_MEMORIES = 2000;
const BATCH = 100;
/** Below this, a match is more likely noise than meaning. */
export const MIN_SCORE = 0.25;

interface MemoryLike {
  id?: unknown;
  title?: unknown;
  detail?: unknown;
}

const vector = (values: number[]) => `[${values.join(",")}]`;

async function embed(texts: string[]) {
  const res = await new OpenAI().embeddings.create({ model: EMBEDDING_MODEL, input: texts, dimensions: DIMENSIONS });
  return res.data.map((d) => d.embedding);
}

/** Embeds new or edited memories and forgets deleted ones. Unchanged memories cost nothing. */
async function syncVectors(userId: string) {
  const workspace = await prisma.workspace.findUnique({ where: { userId }, select: { state: true } });
  const raw = (workspace?.state as { memories?: MemoryLike[] } | null)?.memories;
  const memories = (Array.isArray(raw) ? raw : [])
    .filter((m): m is { id: string; title: string; detail?: string } => typeof m?.id === "string" && typeof m.title === "string")
    .slice(0, MAX_MEMORIES)
    .map((m) => ({ id: m.id, text: [m.title, typeof m.detail === "string" ? m.detail : ""].filter(Boolean).join(". ").slice(0, 2000) }));

  const stored = await prisma.memoryVector.findMany({ where: { userId }, select: { memoryId: true, text: true } });
  const known = new Map(stored.map((s) => [s.memoryId, s.text]));
  const ids = new Set(memories.map((m) => m.id));

  const gone = stored.filter((s) => !ids.has(s.memoryId)).map((s) => s.memoryId);
  if (gone.length) await prisma.memoryVector.deleteMany({ where: { userId, memoryId: { in: gone } } });

  const changed = memories.filter((m) => known.get(m.id) !== m.text);
  for (let i = 0; i < changed.length; i += BATCH) {
    const batch = changed.slice(i, i + BATCH);
    const vectors = await embed(batch.map((m) => m.text));
    await prisma.$transaction(
      batch.map(
        (m, j) => prisma.$executeRaw`
          INSERT INTO memory_vector ("userId", "memoryId", "text", "embedding", "updatedAt")
          VALUES (${userId}, ${m.id}, ${m.text}, ${vector(vectors[j])}::vector, now())
          ON CONFLICT ("userId", "memoryId") DO UPDATE SET "text" = EXCLUDED."text", "embedding" = EXCLUDED."embedding", "updatedAt" = now()`,
      ),
    );
  }
}

/** The user's memories closest in meaning to `query`, best first. */
export async function searchMemories(userId: string, query: string, limit = 10) {
  await syncVectors(userId);
  const [q] = await embed([query]);
  const rows = await prisma.$queryRaw<{ memoryId: string; text: string; score: number }[]>`
    SELECT "memoryId", "text", 1 - ("embedding" <=> ${vector(q)}::vector) AS score
    FROM memory_vector
    WHERE "userId" = ${userId}
    ORDER BY "embedding" <=> ${vector(q)}::vector
    LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, score: Number(r.score) })).filter((r) => r.score >= MIN_SCORE);
}
