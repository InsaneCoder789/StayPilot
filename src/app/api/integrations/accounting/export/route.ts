import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    const auth = await requireSession();
    if (!["HOTEL_ADMIN", "MANAGER", "ACCOUNTANT"].includes(auth.user.role)) return NextResponse.json({ ok: false }, { status: 403 });
    const url = new URL(request.url);
    const from = new Date(url.searchParams.get("from") || new Date(Date.now() - 30 * 86_400_000).toISOString());
    const to = new Date(url.searchParams.get("to") || new Date().toISOString());
    if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || to < from) return NextResponse.json({ ok: false }, { status: 400 });
    const db = getDb();
    const [invoices, payments] = await Promise.all([db.invoice.findMany({ where: { hotelId: auth.hotelId, issuedAt: { gte: from, lte: to } }, orderBy: { issuedAt: "asc" } }), db.payment.findMany({ where: { hotelId: auth.hotelId, processedAt: { gte: from, lte: to } }, orderBy: { processedAt: "asc" } })]);
    const rows = [["record_type", "number", "date", "party", "debit", "credit", "currency", "status"], ...invoices.map((invoice) => ["INVOICE", invoice.invoiceNumber, invoice.issuedAt.toISOString(), invoice.guestName, Number(invoice.totalAmount).toFixed(2), "0.00", invoice.currency, invoice.status]), ...payments.map((payment) => ["PAYMENT", payment.receiptNumber, payment.processedAt.toISOString(), payment.guestName, "0.00", (Number(payment.amount) - Number(payment.amountRefunded)).toFixed(2), "", payment.status])];
    const output = rows.map((row) => row.map(csv).join(",")).join("\n");
    await db.integrationSyncLog.create({ data: { hotelId: auth.hotelId, provider: "CSV_ACCOUNTING", operation: "LEDGER_EXPORT", direction: "OUTBOUND", externalId: randomUUID(), status: "SUCCEEDED", result: { invoiceCount: invoices.length, paymentCount: payments.length, from: from.toISOString(), to: to.toISOString() }, processedAt: new Date() } });
    return new Response(output, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="staypilot-ledger-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
