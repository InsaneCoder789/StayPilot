import { NextResponse } from "next/server";
import { z } from "zod";

import { createSession, verifyPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid login credentials." }, { status: 400 });
  const db = getDb();
  const user = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase(), status: "ACTIVE" } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ ok: false, message: "Invalid login credentials." }, { status: 401 });
  }
  await Promise.all([
    createSession(user.id, user.hotelId),
    db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);
  return NextResponse.json({ ok: true, message: "Login successful." });
}
