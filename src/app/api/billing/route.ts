import { currentUser } from "@/lib/auth";
import { aiUsage, billingConfigured } from "@/lib/billing";
import { prisma } from "@/lib/db";

/** The account's plan, renewal date and how much of today's AI allowance is left. */
export async function GET(req: Request) {
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!billingConfigured()) return Response.json({ configured: false });

  const [usage, billing] = await Promise.all([aiUsage(user.id), prisma.billing.findUnique({ where: { userId: user.id } })]);
  return Response.json(
    {
      configured: true,
      ...usage,
      status: billing?.status ?? "none",
      renews: billing?.currentPeriodEnd?.toISOString() ?? null,
      price: process.env.PRO_PRICE_LABEL ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
