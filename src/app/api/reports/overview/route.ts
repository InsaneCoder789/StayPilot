import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { buildReportOverview } from "@/server/reporting";

export async function GET() {
  try {
    const auth = await requireSession();
    if (!["HOTEL_ADMIN", "MANAGER", "ACCOUNTANT"].includes(auth.user.role)) return NextResponse.json({ ok: false }, { status: 403 });
    return NextResponse.json({ ok: true, report: await buildReportOverview(auth.hotelId) });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
