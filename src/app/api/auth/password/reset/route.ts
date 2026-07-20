import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordPolicyError } from "@/domain/password-policy";
import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/security/tokens";

const schema = z.object({ token: z.string().min(20).max(200), password: z.string().max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid password reset request." }, { status: 400 });
  const policyError = passwordPolicyError(parsed.data.password);
  if (policyError) return NextResponse.json({ ok: false, message: policyError }, { status: 400 });
  const db = getDb();
  const reset = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) }, include: { user: true } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) return NextResponse.json({ ok: false, message: "This reset link is invalid or expired." }, { status: 410 });
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null } }),
    db.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    db.session.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    db.auditLog.create({ data: { hotelId: reset.user.hotelId, userId: reset.userId, actorName: reset.user.name, action: "RESET_PASSWORD", entityType: "User", entityId: reset.userId, target: reset.user.email } }),
  ]);
  return NextResponse.json({ ok: true, message: "Password reset complete. Sign in with the new password." });
}
