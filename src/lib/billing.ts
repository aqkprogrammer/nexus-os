import Stripe from "stripe";
import { prisma } from "./db";

export const billingConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);

/** AI requests a day on each plan. Pro has a ceiling too, so one account can't run up an unbounded bill. */
const DAILY_AI = { free: Number(process.env.FREE_AI_DAILY) || 30, pro: Number(process.env.PRO_AI_DAILY) || 500 };

export type Plan = keyof typeof DAILY_AI;

let client: Stripe | null = null;

/** Tests point the SDK at a local stand-in through STRIPE_API_BASE. */
export function stripe() {
  if (client) return client;
  const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
  client = new Stripe(process.env.STRIPE_SECRET_KEY!, base ? { host: base.hostname, port: base.port, protocol: base.protocol.replace(":", "") as "http" | "https" } : {});
  return client;
}

const PAID = new Set(["active", "trialing"]);
export const planFor = (status: string): Plan => (PAID.has(status) ? "pro" : "free");

export async function planOf(userId: string): Promise<Plan> {
  if (!billingConfigured()) return "pro";
  const billing = await prisma.billing.findUnique({ where: { userId }, select: { plan: true } });
  return billing?.plan === "pro" ? "pro" : "free";
}

const today = () => new Date().toISOString().slice(0, 10);

export async function aiUsage(userId: string) {
  const plan = await planOf(userId);
  const row = await prisma.aiUsage.findUnique({ where: { userId_day: { userId, day: today() } } });
  return { plan, used: row?.count ?? 0, limit: DAILY_AI[plan] };
}

/** Counts one AI request. False once the plan's allowance for today is used up. Unlimited without billing set up. */
export async function spendAi(userId: string) {
  if (!billingConfigured()) return true;
  const plan = await planOf(userId);
  const { count } = await prisma.aiUsage.upsert({
    where: { userId_day: { userId, day: today() } },
    create: { userId, day: today(), count: 1 },
    update: { count: { increment: 1 } },
  });
  return count <= DAILY_AI[plan];
}

export const AI_LIMIT_REACHED = "ai_limit";

/** The account's Stripe customer, created the first time it's needed. */
export async function customerFor(user: { id: string; email: string; name: string }) {
  const existing = await prisma.billing.findUnique({ where: { userId: user.id } });
  if (existing) return existing.customerId;
  const customer = await stripe().customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
  await prisma.billing.create({ data: { userId: user.id, customerId: customer.id } });
  return customer.id;
}
