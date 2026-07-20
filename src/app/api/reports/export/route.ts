import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { buildReportOverview } from "@/server/reporting";

const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET(request: Request) {
  try {
    const auth = await requireSession();
    if (!["HOTEL_ADMIN", "MANAGER", "ACCOUNTANT"].includes(auth.user.role)) return NextResponse.json({ ok: false }, { status: 403 });
    const dataset = new URL(request.url).searchParams.get("dataset") || "forecast";
    const report = await buildReportOverview(auth.hotelId);
    let rows: unknown[][];
    if (dataset === "aging") rows = [["bucket", "amount"], ...Object.entries(report.receivablesAging)];
    else if (dataset === "sources") rows = [["source", "bookings"], ...report.sourceMix.map((row) => [row.source, row.bookings])];
    else rows = [["date", "occupied_rooms", "available_rooms", "occupancy_percent"], ...report.forecast.map((row) => [row.date, row.occupiedRooms, row.availableRooms, row.occupancyPercent])];
    const output = rows.map((row) => row.map(cell).join(",")).join("\n");
    return new Response(output, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="staypilot-${dataset}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
