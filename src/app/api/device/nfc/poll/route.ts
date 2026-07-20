import { NextResponse } from "next/server";

import { requireNfcDevice } from "@/integrations/nfc/device-auth";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/security/cipher";

export async function POST(request: Request) {
  try {
    const device = await requireNfcDevice(request);
    const body = await request.json().catch(() => ({})) as { firmware?: string };
    const db = getDb();
    const command = await db.$transaction(async (tx) => {
      await tx.nfcDevice.update({ where: { id: device.id }, data: { status: "ONLINE", lastHeartbeat: new Date(), firmware: body.firmware?.slice(0, 100) } });
      const retryBefore = new Date(Date.now() - 120_000);
      const queued = await tx.nfcCommand.findFirst({ where: { deviceId: device.id, attempts: { lt: 3 }, OR: [{ status: "QUEUED" }, { status: "CLAIMED", claimedAt: { lt: retryBefore } }] }, orderBy: { createdAt: "asc" } });
      if (!queued) return null;
      return tx.nfcCommand.update({ where: { id: queued.id }, data: { status: "CLAIMED", claimedAt: new Date(), attempts: { increment: 1 } } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ ok: true, command: command ? { id: command.id, type: command.command, payload: JSON.parse(decryptSecret(command.payloadCiphertext)) as unknown } : null });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "DEVICE_UNAUTHORIZED";
    if (!unauthorized) console.error("NFC device polling failed", error);
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
