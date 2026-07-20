import { NextResponse } from "next/server";
import { Webhook } from "svix";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

type ResendEvent = { type: string; data?: { email_id?: string } };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const eventId = request.headers.get("svix-id");
  if (!secret || !eventId) return NextResponse.json({ ok: false }, { status: secret ? 400 : 503 });

  let event: ResendEvent;
  try {
    const rawBody = await request.text();
    event = new Webhook(secret).verify(rawBody, Object.fromEntries(request.headers.entries())) as ResendEvent;
  } catch (error) {
    console.error("Resend webhook signature rejected", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const db = getDb();
  const communication = event.data?.email_id ? await db.communication.findFirst({ where: { provider: "RESEND", providerMessageId: event.data.email_id } }) : null;
  const existing = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider: "RESEND", eventId } } });
  if (existing?.status === "PROCESSED") return NextResponse.json({ received: true });
  const webhook = await db.webhookEvent.upsert({
    where: { provider_eventId: { provider: "RESEND", eventId } },
    create: { hotelId: communication?.hotelId, provider: "RESEND", eventId, eventType: event.type, payload: event as Prisma.InputJsonValue },
    update: {},
  });
  try {
    if (communication && event.type === "email.delivered") await db.communication.update({ where: { id: communication.id }, data: { status: "DELIVERED", deliveredAt: new Date() } });
    if (communication && ["email.bounced", "email.complained", "email.failed"].includes(event.type)) await db.communication.update({ where: { id: communication.id }, data: { status: "FAILED", error: event.type } });
    await db.webhookEvent.update({ where: { id: webhook.id }, data: { status: "PROCESSED", processedAt: new Date() } });
    return NextResponse.json({ received: true });
  } catch (error) {
    await db.webhookEvent.update({ where: { id: webhook.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" } });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
