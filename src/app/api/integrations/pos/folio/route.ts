import { NextResponse } from "next/server";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { verifySharedSignature } from "@/integrations/signature";
import { getDb } from "@/lib/db";

const schema = z.object({ hotelId: z.string().min(1), externalId: z.string().min(1).max(200), invoiceNumber: z.string().min(1), outlet: z.string().min(1), charges: z.array(z.object({ label: z.string().min(1), quantity: z.number().positive().default(1), amount: z.number().positive() })).min(1).max(100) });

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySharedSignature(rawBody, request.headers.get("x-staypilot-signature"), process.env.POS_WEBHOOK_SECRET)) return NextResponse.json({ ok: false }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 }); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const db = getDb();
  if (!await db.hotel.findUnique({ where: { id: parsed.data.hotelId }, select: { id: true } })) return NextResponse.json({ ok: false }, { status: 404 });
  const provider = (request.headers.get("x-staypilot-provider") || "POS").toUpperCase().slice(0, 60);
  const duplicate = await db.integrationSyncLog.findUnique({ where: { provider_operation_externalId: { provider, operation: "FOLIO_POST", externalId: parsed.data.externalId } } });
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  const sync = await db.integrationSyncLog.create({ data: { hotelId: parsed.data.hotelId, provider, operation: "FOLIO_POST", direction: "INBOUND", externalId: parsed.data.externalId, payload: parsed.data as Prisma.InputJsonValue } });
  try {
    const total = parsed.data.charges.reduce((sum, charge) => sum + charge.amount, 0);
    const invoice = await db.$transaction(async (tx) => {
      const row = await tx.invoice.findFirst({ where: { hotelId: parsed.data.hotelId, invoiceNumber: parsed.data.invoiceNumber, status: { not: "VOID" } } });
      if (!row) throw new Error("INVOICE_NOT_FOUND");
      await tx.invoiceItem.createMany({ data: parsed.data.charges.map((charge) => ({ invoiceId: row.id, label: charge.label, quantity: charge.quantity, unitAmount: charge.amount / charge.quantity, amount: charge.amount, category: `POS:${parsed.data.outlet}` })) });
      const updated = await tx.invoice.update({ where: { id: row.id }, data: { subtotal: { increment: total }, totalAmount: { increment: total }, balanceAmount: { increment: total } } });
      if (row.bookingId) await tx.booking.update({ where: { id: row.bookingId }, data: { totalAmount: { increment: total }, paymentStatus: updated.balanceAmount.toNumber() > 0 && updated.paidAmount.toNumber() > 0 ? "PARTIAL" : updated.balanceAmount.toNumber() > 0 ? "UNPAID" : "PAID" } });
      return updated;
    }, { isolationLevel: "Serializable" });
    await db.integrationSyncLog.update({ where: { id: sync.id }, data: { status: "SUCCEEDED", result: { invoiceId: invoice.id, postedAmount: total }, processedAt: new Date() } });
    return NextResponse.json({ ok: true, postedAmount: total });
  } catch (error) {
    await db.integrationSyncLog.update({ where: { id: sync.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error", processedAt: new Date() } });
    return NextResponse.json({ ok: false }, { status: 422 });
  }
}
