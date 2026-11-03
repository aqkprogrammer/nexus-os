import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Hot reloads in development would otherwise open a new connection pool each time.
const saved = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = saved.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV !== "production") saved.prisma = prisma;
