import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNfcDevice } from "@/integrations/nfc/device-auth";
import { getDb } from "@/lib/db";

const schema = z.object({ commandId: z.string().min(1), success: z.boolean(), error: z.string().max(500).optional() });

export async function POST(request: Request) {
  try {
    const device = await requireNfcDevice(request);
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const db = getDb();
    const command = await db.nfcCommand.findFirst({ where: { id: parsed.data.commandId, deviceId: device.id, status: "CLAIMED" }, include: { roomCard: { include: { room: true } } } });
    if (!command) return NextResponse.json({ ok: false, message: "Command not found." }, { status: 404 });
    await db.$transaction(async (tx) => {
      await tx.nfcCommand.update({ where: { id: command.id }, data: { status: parsed.data.success ? "SUCCEEDED" : "FAILED", completedAt: new Date(), error: parsed.data.error } });
      await tx.nfcDevice.update({ where: { id: device.id }, data: { status: parsed.data.success ? "ONLINE" : "DEGRADED", lastHeartbeat: new Date(), lastError: parsed.data.success ? null : parsed.data.error } });
      if (command.roomCard) {
        const revocation = command.command === "REVOKE_CREDENTIAL";
        await tx.roomCard.update({ where: { id: command.roomCard.id }, data: parsed.data.success ? { status: revocation ? "EXPIRED" : "ACTIVE", issuedAt: revocation ? command.roomCard.issuedAt : new Date(), revokedAt: revocation ? new Date() : null } : { status: "READY" } });
        if (parsed.data.success) await tx.nfcAccessEvent.create({ data: { hotelId: device.hotelId, cardId: command.roomCard.id, event: revocation ? "EXPIRED" : "ENCODED", location: device.location, metadata: { deviceCode: device.deviceCode, commandId: command.id } } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "DEVICE_UNAUTHORIZED";
    if (!unauthorized) console.error("NFC device result failed", error);
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
