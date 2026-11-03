import type Stripe from "stripe";
import { billingConfigured, planFor, stripe } from "@/lib/billing";
import { prisma } from "@/lib/db";

/** The period end moved onto subscription items in newer Stripe API versions. */
function periodEnd(sub: Stripe.Subscription) {
  const seconds = sub.items?.data?.[0]?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return seconds ? new Date(seconds * 1000) : null;
}

async function applySubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.billing.updateMany({
    where: { customerId },
    data: { subscriptionId: sub.id, status: sub.status, plan: planFor(sub.status), currentPeriodEnd: periodEnd(sub) },
  });
}

/** Stripe tells the app about payments here. Only signed events are trusted. */
export async function POST(req: Request) {
  if (!billingConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) return Response.json({ error: "not_configured" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!customerId || !session.client_reference_id) break;
      // Pro starts as soon as the payment goes through. The subscription events that follow fill in the details.
      await prisma.billing.updateMany({
        where: { customerId, userId: session.client_reference_id },
        data: { plan: "pro", status: "active", subscriptionId: typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null) },
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object);
      break;
  }
  return Response.json({ received: true });
}
