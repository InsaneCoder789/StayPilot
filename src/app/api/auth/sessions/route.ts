import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  const sessions = await getDb().session.findMany({
    where: { userId: session.user.id, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, deviceName: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
  });
  return NextResponse.json({ currentSessionId: session.id, sessions });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, message: "Authentication required." }, { status: 401 });
  const parsed = z.object({ sessionId: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid session." }, { status: 400 });
  const result = await getDb().session.updateMany({
    where: { id: parsed.data.sessionId, userId: session.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: result.count > 0, message: result.count ? "Session revoked." : "Session not found." });
}
