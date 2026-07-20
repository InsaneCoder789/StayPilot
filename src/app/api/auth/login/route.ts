import { NextResponse } from "next/server";
import { verify as verifyOtp } from "otplib";
import { z } from "zod";

import { failedLoginUpdate, isAccountLocked } from "@/domain/login-security";
import { createSession, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/security/cipher";

const schema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(200),
  otp: z.string().trim().regex(/^\d{6}$/).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid login credentials." }, { status: 400 });
  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const user = await db.user.findFirst({ where: { email } });

  if (user && isAccountLocked(user.lockedUntil)) {
    await db.loginAttempt.create({ data: { hotelId: user.hotelId, email, ipAddress, success: false, reason: "ACCOUNT_LOCKED" } });
    return NextResponse.json({ ok: false, message: "Invalid login credentials. Try again later." }, { status: 429 });
  }

  const validPassword = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || user.status !== "ACTIVE" || !validPassword) {
    await db.$transaction(async (tx) => {
      if (user) await tx.user.update({ where: { id: user.id }, data: failedLoginUpdate(user.failedLoginAttempts) });
      await tx.loginAttempt.create({ data: { hotelId: user?.hotelId, email, ipAddress, success: false, reason: "INVALID_CREDENTIALS" } });
    });
    return NextResponse.json({ ok: false, message: "Invalid login credentials." }, { status: 401 });
  }

  if (user.mfaEnabled) {
    if (!parsed.data.otp) {
      return NextResponse.json({ ok: false, requiresMfa: true, message: "Enter your authenticator code." }, { status: 202 });
    }
    const secret = user.mfaSecretEncrypted ? decryptSecret(user.mfaSecretEncrypted) : "";
    const verification = secret ? await verifyOtp({ secret, token: parsed.data.otp }) : { valid: false };
    if (!verification.valid) {
      await db.loginAttempt.create({ data: { hotelId: user.hotelId, email, ipAddress, success: false, reason: "INVALID_MFA" } });
      return NextResponse.json({ ok: false, requiresMfa: true, message: "The authenticator code is invalid." }, { status: 401 });
    }
  }

  await Promise.all([
    createSession(user.id, user.hotelId),
    db.$transaction([
      db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null } }),
      db.loginAttempt.create({ data: { hotelId: user.hotelId, email, ipAddress, success: true, reason: "AUTHENTICATED" } }),
    ]),
  ]);
  return NextResponse.json({ ok: true, message: "Login successful." });
}
