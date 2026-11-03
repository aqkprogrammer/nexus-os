import { userInfo } from "node:os";
import pg from "pg";

export const DATABASE_URL = process.env.TEST_DATABASE_URL ?? `postgresql://${userInfo().username}@localhost:5432/nexus_os_test`;

/** Runs one query against the test database, for setup the app has no screen for. */
export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}
