import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createOpaqueToken } from "@/lib/security/tokens";

const roles = ["HOTEL_ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPING", "MAINTENANCE", "ACCOUNTANT"] as const;
const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254), role: z.enum(roles) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  if (session.user.role !== "HOTEL_ADMIN") return NextResponse.json({ ok: false, message: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid staff invitation." }, { status: 400 });
  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findFirst({ where: { hotelId: session.hotelId, email } })) return NextResponse.json({ ok: false, message: "A staff account already uses this email." }, { status: 409 });
  const { token, tokenHash } = createOpaqueToken();
  await db.$transaction(async (tx) => {
    await tx.staffInvitation.updateMany({ where: { hotelId: session.hotelId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const invitation = await tx.staffInvitation.create({ data: { hotelId: session.hotelId, email, name: parsed.data.name, role: parsed.data.role, tokenHash, createdByName: session.user.name, expiresAt: new Date(Date.now() + 72 * 60 * 60_000) } });
    await tx.auditLog.create({ data: { hotelId: session.hotelId, userId: session.user.id, actorName: session.user.name, action: "INVITE_USER", entityType: "StaffInvitation", entityId: invitation.id, target: email } });
  });
  const invitationUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/login?invite=${token}`;
  return NextResponse.json({ ok: true, message: "Staff invitation created.", invitationUrl });
}
