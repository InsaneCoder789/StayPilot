import { NextResponse } from "next/server";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { verifySharedSignature } from "@/integrations/signature";
import { getDb } from "@/lib/db";
import { nextDocumentCode } from "@/server/document-sequence";

const schema = z.object({
  hotelId: z.string().min(1),
  externalReservationId: z.string().min(1).max(200),
  event: z.enum(["CREATED", "UPDATED", "CANCELLED"]),
  guest: z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email().optional().default(""), phone: z.string().optional().default("") }),
  roomType: z.string().min(1),
  checkIn: z.iso.datetime(),
  checkOut: z.iso.datetime(),
  totalAmount: z.number().positive(),
  specialRequests: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifySharedSignature(rawBody, request.headers.get("x-staypilot-signature"), process.env.OTA_WEBHOOK_SECRET)) return NextResponse.json({ ok: false }, { status: 401 });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ ok: false, message: "Invalid JSON payload." }, { status: 400 }); }
  const parsed = schema.safeParse(payload);
  if (!parsed.success || new Date(parsed.data.checkOut) <= new Date(parsed.data.checkIn)) return NextResponse.json({ ok: false, message: "Invalid reservation payload." }, { status: 400 });
  const provider = (request.headers.get("x-staypilot-provider") || "OTA").toUpperCase().slice(0, 60);
  const eventId = request.headers.get("x-staypilot-event-id")?.slice(0, 200);
  if (!eventId) return NextResponse.json({ ok: false, message: "Event ID required." }, { status: 400 });
  const db = getDb();
  const duplicate = await db.integrationSyncLog.findUnique({ where: { provider_operation_externalId: { provider, operation: "RESERVATION_EVENT", externalId: eventId } } });
  if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
  const hotel = await db.hotel.findUnique({ where: { id: parsed.data.hotelId } });
  if (!hotel) return NextResponse.json({ ok: false }, { status: 404 });
  const source = `${provider}:${parsed.data.externalReservationId}`;
  const sync = await db.integrationSyncLog.create({ data: { hotelId: hotel.id, provider, operation: "RESERVATION_EVENT", direction: "INBOUND", externalId: eventId, payload: parsed.data as Prisma.InputJsonValue } });
  try {
    const booking = await db.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({ where: { hotelId: hotel.id, source } });
      if (parsed.data.event === "CANCELLED") {
        if (!existing) throw new Error("EXTERNAL_BOOKING_NOT_FOUND");
        return tx.booking.update({ where: { id: existing.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: `${provider} cancellation` } });
      }
      if (existing) return tx.booking.update({ where: { id: existing.id }, data: { guestName: `${parsed.data.guest.firstName} ${parsed.data.guest.lastName}`, roomTypeName: parsed.data.roomType, checkInAt: new Date(parsed.data.checkIn), checkOutAt: new Date(parsed.data.checkOut), totalAmount: parsed.data.totalAmount, specialRequests: parsed.data.specialRequests } });
      const bookingCode = await nextDocumentCode(tx, hotel.id, "BOOKING", "BK");
      const invoiceNumber = await nextDocumentCode(tx, hotel.id, "INVOICE", "INV");
      const guest = await tx.guest.create({ data: { hotelId: hotel.id, firstName: parsed.data.guest.firstName, lastName: parsed.data.guest.lastName, email: parsed.data.guest.email, phone: parsed.data.guest.phone, nationality: "", preferences: [] } });
      const row = await tx.booking.create({ data: { hotelId: hotel.id, code: bookingCode, guestId: guest.id, guestName: `${guest.firstName} ${guest.lastName}`, roomTypeName: parsed.data.roomType, status: "CONFIRMED", source, checkInAt: new Date(parsed.data.checkIn), checkOutAt: new Date(parsed.data.checkOut), totalAmount: parsed.data.totalAmount, specialRequests: parsed.data.specialRequests } });
      const invoice = await tx.invoice.create({ data: { hotelId: hotel.id, bookingId: row.id, guestId: guest.id, invoiceNumber, bookingCode, guestName: row.guestName, guestEmail: guest.email || null, subtotal: parsed.data.totalAmount, totalAmount: parsed.data.totalAmount, balanceAmount: parsed.data.totalAmount, currency: hotel.currency, items: { create: { label: `${provider} reservation`, unitAmount: parsed.data.totalAmount, amount: parsed.data.totalAmount, category: "ROOM_CHARGE" } } } });
      await tx.document.create({ data: { hotelId: hotel.id, title: `Invoice ${invoiceNumber}`, type: "INVOICE", linkedRef: invoice.invoiceNumber } });
      return row;
    }, { isolationLevel: "Serializable" });
    await db.integrationSyncLog.update({ where: { id: sync.id }, data: { status: "SUCCEEDED", result: { bookingId: booking.id, bookingCode: booking.code }, processedAt: new Date() } });
    return NextResponse.json({ ok: true, bookingCode: booking.code });
  } catch (error) {
    await db.integrationSyncLog.update({ where: { id: sync.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error", processedAt: new Date() } });
    return NextResponse.json({ ok: false }, { status: 422 });
  }
}
