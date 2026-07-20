import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { createOpaqueToken } from "@/lib/security/tokens";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  const generic = { ok: true, message: "If the account exists, password reset instructions have been created." };
  if (!parsed.success) return NextResponse.json(generic);
  const db = getDb();
  const user = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" } });
  if (!user) return NextResponse.json(generic);
  const { token, tokenHash } = createOpaqueToken();
  await db.$transaction([
    db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60 * 60_000) } }),
    db.auditLog.create({ data: { hotelId: user.hotelId, userId: user.id, actorName: user.name, action: "REQUEST_PASSWORD_RESET", entityType: "User", entityId: user.id, target: user.email } }),
  ]);
  const resetUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/login?reset=${token}`;
  return NextResponse.json({ ...generic, ...(process.env.NODE_ENV !== "production" ? { resetUrl } : {}) });
}
