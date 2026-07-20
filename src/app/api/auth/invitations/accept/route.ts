import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordPolicyError } from "@/domain/password-policy";
import { createSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/security/tokens";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid invitation." }, { status: 400 });
  const policyError = passwordPolicyError(parsed.data.password);
  if (policyError) return NextResponse.json({ ok: false, message: policyError }, { status: 400 });
  const db = getDb();
  const invitation = await db.staffInvitation.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date()) {
    return NextResponse.json({ ok: false, message: "This invitation is invalid or expired." }, { status: 410 });
  }
  const user = await db.$transaction(async (tx) => {
    const row = await tx.user.create({ data: { hotelId: invitation.hotelId, name: invitation.name, email: invitation.email, passwordHash: await hashPassword(parsed.data.password), role: invitation.role, status: "ACTIVE", shiftLabel: "Unassigned", workload: "No active allocation" } });
    await tx.propertyAccess.create({ data: { hotelId: invitation.hotelId, userId: row.id, role: invitation.role } });
    await tx.staffInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    await tx.auditLog.create({ data: { hotelId: invitation.hotelId, userId: row.id, actorName: row.name, action: "ACCEPT_INVITATION", entityType: "User", entityId: row.id, target: row.email } });
    return row;
  });
  await createSession(user.id, user.hotelId);
  return NextResponse.json({ ok: true, message: "Staff account activated." });
}
