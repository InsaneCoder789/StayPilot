import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({ propertyId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    const access = await getDb().propertyAccess.findUnique({ where: { hotelId_userId: { hotelId: parsed.data.propertyId, userId: auth.user.id } } });
    if (!access?.active) return NextResponse.json({ ok: false, message: "Property access denied." }, { status: 403 });
    await getDb().session.update({ where: { id: auth.id }, data: { hotelId: parsed.data.propertyId } });
    return NextResponse.json({ ok: true, message: "Property switched." });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
