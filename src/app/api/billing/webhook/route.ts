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
  const billing = await prisma.billing.findUnique({ where: { customerId } });
  if (!billing) return;
  // Another subscription only takes over once it's paid for, so an old one ending can't cancel a newer one.
  const current = !billing.subscriptionId || billing.subscriptionId === sub.id;
  if (!current && planFor(sub.status) !== "pro") return;
  await prisma.billing.update({
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
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : (session.subscription?.id ?? null);
      // Pro starts as soon as the payment has cleared. A slower payment, like a bank debit, waits for Stripe's subscription events.
      const paid = session.payment_status === "paid" || session.payment_status === "no_payment_required";
      await prisma.billing.updateMany({
        where: { customerId, userId: session.client_reference_id },
        data: paid ? { plan: "pro", status: "active", subscriptionId } : { subscriptionId },
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
