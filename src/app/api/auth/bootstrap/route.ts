import { NextResponse } from "next/server";
import { z } from "zod";

import { passwordPolicyError } from "@/domain/password-policy";
import { createSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Enter a valid name, email, and password." }, { status: 400 });
  const policyError = passwordPolicyError(parsed.data.password);
  if (policyError) return NextResponse.json({ ok: false, message: policyError }, { status: 400 });
  const db = getDb();
  if ((await db.user.count()) > 0) {
    return NextResponse.json({ ok: false, message: "Owner account already exists." }, { status: 409 });
  }
  const hotel = await db.hotel.findFirst({ orderBy: { createdAt: "asc" } });
  if (!hotel) return NextResponse.json({ ok: false, message: "Property setup is missing." }, { status: 500 });
  const user = await db.$transaction(async (tx) => {
    const owner = await tx.user.create({
      data: {
        hotelId: hotel.id,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await hashPassword(parsed.data.password),
        role: "HOTEL_ADMIN",
        status: "ACTIVE",
        employeeCode: "OWNER-001",
        department: "Administration",
        shiftLabel: "Property oversight",
        workload: "Full access",
      },
    });
    await tx.auditLog.create({
      data: { hotelId: hotel.id, userId: owner.id, action: "BOOTSTRAP_OWNER", actorName: owner.name, entityType: "User", entityId: owner.id, target: owner.email },
    });
    return owner;
  });
  await createSession(user.id, hotel.id);
  return NextResponse.json({ ok: true, message: "Owner account created." });
}
