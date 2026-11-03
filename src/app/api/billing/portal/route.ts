import { currentUser } from "@/lib/auth";
import { billingConfigured, stripe } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

/** Opens Stripe's billing portal, where the user changes their card, sees invoices or cancels. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!billingConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const billing = await prisma.billing.findUnique({ where: { userId: user.id } });
  if (!billing) return Response.json({ error: "No billing yet" }, { status: 404 });

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: billing.customerId,
      return_url: `${process.env.BETTER_AUTH_URL ?? new URL(req.url).origin}/settings#plan`,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("Billing portal failed:", e);
    return Response.json({ error: "Couldn't reach Stripe. Try again." }, { status: 502 });
  }
}
