import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { toMinorUnits } from "@/domain/finance";
import { getStripe } from "@/integrations/payments/stripe";
import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const checkoutSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!["HOTEL_ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT"].includes(auth.user.role)) {
      return NextResponse.json({ ok: false, message: "Your role cannot create payment links." }, { status: 403 });
    }
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Choose an invoice and positive amount." }, { status: 400 });

    const stripe = getStripe();
    const db = getDb();
    const invoice = await db.invoice.findFirst({ where: { id: parsed.data.invoiceId, hotelId: auth.hotelId } });
    if (!invoice || Number(invoice.balanceAmount) <= 0) {
      return NextResponse.json({ ok: false, message: "Open invoice not found." }, { status: 404 });
    }
    const amount = Math.min(parsed.data.amount, Number(invoice.balanceAmount));
    const idempotencyKey = randomUUID();
    const paymentRequest = await db.paymentRequest.create({
      data: {
        hotelId: auth.hotelId,
        invoiceId: invoice.id,
        provider: "STRIPE",
        idempotencyKey,
        amount,
        currency: invoice.currency.toUpperCase(),
        createdBy: auth.user.name,
      },
    });

    const configuredUrl = process.env.APP_URL?.replace(/\/$/, "");
    const origin = configuredUrl || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${origin}/payments?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payments?checkout=cancelled`,
      customer_email: invoice.guestEmail ?? undefined,
      client_reference_id: invoice.invoiceNumber,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: invoice.currency.toLowerCase(),
          unit_amount: toMinorUnits(amount),
          product_data: { name: `Hotel payment · ${invoice.invoiceNumber}`, description: invoice.guestName },
        },
      }],
      metadata: { payment_request_id: paymentRequest.id, hotel_id: auth.hotelId, invoice_id: invoice.id },
    }, { idempotencyKey });

    if (!session.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
    await db.paymentRequest.update({
      where: { id: paymentRequest.id },
      data: { providerSessionId: session.id, checkoutUrl: session.url, expiresAt: new Date(session.expires_at * 1000) },
    });
    return NextResponse.json({ ok: true, url: session.url, paymentRequestId: paymentRequest.id });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    const unavailable = error instanceof Error && error.message === "STRIPE_NOT_CONFIGURED";
    if (!unauthorized && !unavailable) console.error("Payment checkout creation failed", error);
    return NextResponse.json(
      { ok: false, message: unauthorized ? "Authentication required." : unavailable ? "Stripe is not configured for this deployment." : "Payment link could not be created." },
      { status: unauthorized ? 401 : unavailable ? 503 : 500 },
    );
  }
}
