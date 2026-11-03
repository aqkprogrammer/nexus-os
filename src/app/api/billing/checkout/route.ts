import { currentUser } from "@/lib/auth";
import { billingConfigured, customerFor, stripe } from "@/lib/billing";
import { prisma } from "@/lib/db";
import { sameOrigin } from "@/lib/request";

const appUrl = (req: Request) => process.env.BETTER_AUTH_URL ?? new URL(req.url).origin;

/** Starts Stripe Checkout for Pro. Stripe hosts the payment page, so card details never touch this server. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "forbidden" }, { status: 403 });
  const user = await currentUser(req);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!billingConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const billing = await prisma.billing.findUnique({ where: { userId: user.id } });
  if (billing?.plan === "pro") return Response.json({ error: "Already on Pro" }, { status: 409 });

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer: await customerFor(user),
      client_reference_id: user.id,
      line_items: [{ price: process.env.STRIPE_PRICE_PRO!, quantity: 1 }],
      success_url: `${appUrl(req)}/settings?billing=success#plan`,
      cancel_url: `${appUrl(req)}/settings#plan`,
      allow_promotion_codes: true,
    });
    return Response.json({ url: session.url });
  } catch (e) {
    console.error("Checkout failed:", e);
    return Response.json({ error: "Couldn't reach Stripe. Try again." }, { status: 502 });
  }
}
