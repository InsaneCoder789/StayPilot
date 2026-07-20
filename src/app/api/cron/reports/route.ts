import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { runScheduledReport } from "@/server/reporting";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) return NextResponse.json({ ok: false }, { status: 401 });
  const schedules = await getDb().reportSchedule.findMany({ where: { active: true, nextRunAt: { lte: new Date() } }, orderBy: { nextRunAt: "asc" }, take: 25 });
  const results = await Promise.allSettled(schedules.map((schedule) => runScheduledReport(schedule.id)));
  return NextResponse.json({ ok: true, processed: results.length, completed: results.filter((result) => result.status === "fulfilled").length, failed: results.filter((result) => result.status === "rejected").length });
}
