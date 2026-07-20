import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(2).max(120), reportType: z.enum(["MANAGEMENT_OVERVIEW", "REVENUE", "OPERATIONS", "RECEIVABLES"]), frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]), recipients: z.array(z.string().email()).max(20).default([]), nextRunAt: z.iso.datetime() });

export async function POST(request: Request) {
  try {
    const auth = await requireSession();
    if (!["HOTEL_ADMIN", "MANAGER", "ACCOUNTANT"].includes(auth.user.role)) return NextResponse.json({ ok: false }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Complete the schedule with valid recipients and run time." }, { status: 400 });
    const schedule = await getDb().reportSchedule.create({ data: { hotelId: auth.hotelId, name: parsed.data.name, reportType: parsed.data.reportType, frequency: parsed.data.frequency, recipients: parsed.data.recipients, nextRunAt: new Date(parsed.data.nextRunAt), createdBy: auth.user.name } });
    return NextResponse.json({ ok: true, message: "Report schedule created.", scheduleId: schedule.id });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}
