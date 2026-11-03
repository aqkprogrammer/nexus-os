import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

// Reads .env.local the same way Next.js does.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
