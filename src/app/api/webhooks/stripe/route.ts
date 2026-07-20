import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { fromMinorUnits } from "@/domain/finance";
import { getStripe, getStripeWebhookSecret } from "@/integrations/payments/stripe";
import { getDb } from "@/lib/db";
import { captureInvoicePayment } from "@/server/payment-service";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, getStripeWebhookSecret());
  } catch (error) {
    console.error("Stripe webhook signature rejected", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: "STRIPE", eventId: event.id } } });
  if (existing?.status === "PROCESSED") return NextResponse.json({ received: true });

  const session = event.data.object as Stripe.Checkout.Session;
  const hotelId = event.type.startsWith("checkout.session.") ? session.metadata?.hotel_id : undefined;
  const row = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider: "STRIPE", eventId: event.id } },
    create: { provider: "STRIPE", eventId: event.id, eventType: event.type, hotelId, payload: JSON.parse(JSON.stringify(event)) },
    update: {},
  });

  try {
    if (event.type === "checkout.session.completed" && session.payment_status === "paid") {
      const requestId = session.metadata?.payment_request_id;
      const paymentRequest = requestId ? await db.paymentRequest.findUnique({ where: { id: requestId } }) : null;
      if (!paymentRequest || paymentRequest.providerSessionId !== session.id) throw new Error("PAYMENT_REQUEST_NOT_FOUND");
      if (paymentRequest.status !== "COMPLETED") {
        const amount = session.amount_total == null ? 0 : fromMinorUnits(session.amount_total);
        if (Math.abs(amount - Number(paymentRequest.amount)) > 0.001) throw new Error("PAYMENT_AMOUNT_MISMATCH");
        const providerPaymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await captureInvoicePayment({
          hotelId: paymentRequest.hotelId,
          invoiceId: paymentRequest.invoiceId,
          amount,
          method: "CARD",
          reference: providerPaymentId ?? session.id,
          processedBy: "Stripe Checkout",
          provider: "STRIPE",
          providerPaymentId: providerPaymentId ?? session.id,
          idempotencyKey: `stripe:${event.id}`,
          paymentRequestId: paymentRequest.id,
        });
      }
    } else if (event.type === "checkout.session.expired") {
      await db.paymentRequest.updateMany({ where: { providerSessionId: session.id, status: "PENDING" }, data: { status: "EXPIRED" } });
    }
    await db.webhookEvent.update({ where: { id: row.id }, data: { status: "PROCESSED", processedAt: new Date() } });
    return NextResponse.json({ received: true });
  } catch (error) {
    await db.webhookEvent.update({ where: { id: row.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" } });
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
