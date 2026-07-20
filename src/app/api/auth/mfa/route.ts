import { generateSecret, generateURI, verify as verifyOtp } from "otplib";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/security/cipher";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({ action: z.literal("enable"), otp: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal("disable"), password: z.string().min(1).max(200) }),
]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid MFA request." }, { status: 400 });
  const db = getDb();

  if (parsed.data.action === "setup") {
    const secret = generateSecret();
    await db.user.update({ where: { id: session.user.id }, data: { mfaSecretEncrypted: encryptSecret(secret), mfaEnabled: false } });
    return NextResponse.json({
      ok: true,
      message: "Authenticator setup started.",
      secret,
      uri: generateURI({ issuer: "StayPilot", label: session.user.email, secret }),
    });
  }

  if (parsed.data.action === "enable") {
    if (!session.user.mfaSecretEncrypted) return NextResponse.json({ ok: false, message: "Start MFA setup first." }, { status: 409 });
    const verification = await verifyOtp({ secret: decryptSecret(session.user.mfaSecretEncrypted), token: parsed.data.otp });
    if (!verification.valid) return NextResponse.json({ ok: false, message: "The authenticator code is invalid." }, { status: 400 });
    await db.$transaction([
      db.user.update({ where: { id: session.user.id }, data: { mfaEnabled: true } }),
      db.session.updateMany({ where: { userId: session.user.id, id: { not: session.id }, revokedAt: null }, data: { revokedAt: new Date() } }),
      db.auditLog.create({ data: { hotelId: session.hotelId, userId: session.user.id, actorName: session.user.name, action: "ENABLE_MFA", entityType: "User", entityId: session.user.id, target: session.user.email } }),
    ]);
    return NextResponse.json({ ok: true, message: "Multi-factor authentication enabled." });
  }

  if (!(await verifyPassword(parsed.data.password, session.user.passwordHash))) {
    return NextResponse.json({ ok: false, message: "Password confirmation failed." }, { status: 401 });
  }
  await db.$transaction([
    db.user.update({ where: { id: session.user.id }, data: { mfaEnabled: false, mfaSecretEncrypted: null } }),
    db.auditLog.create({ data: { hotelId: session.hotelId, userId: session.user.id, actorName: session.user.name, action: "DISABLE_MFA", entityType: "User", entityId: session.user.id, target: session.user.email } }),
  ]);
  return NextResponse.json({ ok: true, message: "Multi-factor authentication disabled." });
}
