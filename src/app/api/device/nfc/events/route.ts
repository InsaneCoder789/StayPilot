import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNfcDevice } from "@/integrations/nfc/device-auth";
import { getDb } from "@/lib/db";

const schema = z.object({ events: z.array(z.object({ cardId: z.string().min(1), event: z.enum(["ACCESS_GRANTED", "ACCESS_DENIED"]), location: z.string().min(1).max(200), occurredAt: z.iso.datetime().optional() })).min(1).max(100) });

export async function POST(request: Request) {
  try {
    const device = await requireNfcDevice(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const db = getDb();
    const cards = await db.roomCard.findMany({ where: { hotelId: device.hotelId, id: { in: parsed.data.events.map((event) => event.cardId) } }, select: { id: true } });
    const allowed = new Set(cards.map((card) => card.id));
    if (parsed.data.events.some((event) => !allowed.has(event.cardId))) return NextResponse.json({ ok: false }, { status: 403 });
    await db.$transaction(async (tx) => {
      await tx.nfcAccessEvent.createMany({ data: parsed.data.events.map((event) => ({ hotelId: device.hotelId, cardId: event.cardId, event: event.event, location: event.location, occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(), metadata: { deviceCode: device.deviceCode } })) });
      await tx.nfcDevice.update({ where: { id: device.id }, data: { status: "ONLINE", lastHeartbeat: new Date() } });
    });
    return NextResponse.json({ ok: true, accepted: parsed.data.events.length });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "DEVICE_UNAUTHORIZED";
    if (!unauthorized) console.error("NFC access event ingestion failed", error);
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
