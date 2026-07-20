import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const [session, userCount] = await Promise.all([getSession(), db.user.count()]);
  return NextResponse.json({
    hasUsers: userCount > 0,
    user: session
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          active: session.user.status === "ACTIVE",
          status: session.user.status,
          mfaEnabled: session.user.mfaEnabled,
        }
      : null,
  });
}
