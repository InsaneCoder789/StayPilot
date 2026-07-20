import "server-only";

import { createHash } from "node:crypto";

import type { Prisma, ReportFrequency } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

const DAY = 86_400_000;

export type ReportOverview = Awaited<ReturnType<typeof buildReportOverview>>;

export async function buildReportOverview(hotelId: string, now = new Date()) {
  const db = getDb();
  const start30 = new Date(now.getTime() - 30 * DAY);
  const forecastEnd = new Date(now.getTime() + 14 * DAY);
  const [hotel, roomGroups, roomCount, bookings, sourceGroups, invoices, paymentTotals, tasks, openIncidents, lowStockRows, schedules, runs] = await Promise.all([
    db.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { name: true, currency: true } }),
    db.room.groupBy({ by: ["status"], where: { hotelId }, _count: true }),
    db.room.count({ where: { hotelId, outOfService: false } }),
    db.booking.findMany({ where: { hotelId, status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] }, checkOutAt: { gt: now }, checkInAt: { lt: forecastEnd } }, select: { checkInAt: true, checkOutAt: true, totalAmount: true, createdAt: true } }),
    db.booking.groupBy({ by: ["source"], where: { hotelId, createdAt: { gte: start30 } }, _count: true }),
    db.invoice.findMany({ where: { hotelId, balanceAmount: { gt: 0 }, status: { not: "VOID" } }, select: { balanceAmount: true, dueAt: true, issuedAt: true } }),
    db.payment.aggregate({ where: { hotelId, processedAt: { gte: start30 }, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amount: true, amountRefunded: true } }),
    db.operationalTask.findMany({ where: { hotelId, createdAt: { gte: start30 } }, select: { status: true, createdAt: true, completedAt: true, dueAt: true } }),
    db.incident.count({ where: { hotelId, status: { in: ["OPEN", "INVESTIGATING"] } } }),
    db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "InventoryItem" WHERE "hotelId" = ${hotelId} AND active = true AND "stockOnHand" <= "reorderLevel"`,
    db.reportSchedule.findMany({ where: { hotelId }, orderBy: { nextRunAt: "asc" }, take: 100 }),
    db.reportRun.findMany({ where: { hotelId }, orderBy: { startedAt: "desc" }, take: 20 }),
  ]);

  const forecast = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() + index);
    const end = new Date(date.getTime() + DAY);
    const occupied = bookings.filter((booking) => booking.checkInAt < end && booking.checkOutAt > date).length;
    return { date: date.toISOString().slice(0, 10), occupiedRooms: occupied, availableRooms: Math.max(roomCount - occupied, 0), occupancyPercent: Math.round((occupied / Math.max(roomCount, 1)) * 100) };
  });
  const aging = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0 };
  for (const invoice of invoices) {
    const age = Math.floor((now.getTime() - (invoice.dueAt ?? invoice.issuedAt).getTime()) / DAY);
    const balance = Number(invoice.balanceAmount);
    if (age <= 0) aging.current += balance;
    else if (age <= 30) aging.days1to30 += balance;
    else if (age <= 60) aging.days31to60 += balance;
    else if (age <= 90) aging.days61to90 += balance;
    else aging.over90 += balance;
  }
  const completedTasks = tasks.filter((task) => task.completedAt);
  const averageResolutionHours = completedTasks.length ? completedTasks.reduce((sum, task) => sum + (task.completedAt!.getTime() - task.createdAt.getTime()) / 3_600_000, 0) / completedTasks.length : 0;
  const overdueTasks = tasks.filter((task) => !["COMPLETED", "CANCELLED"].includes(task.status) && task.dueAt && task.dueAt < now).length;
  const pickup = bookings.filter((booking) => booking.createdAt >= new Date(now.getTime() - 7 * DAY) && booking.checkInAt <= new Date(now.getTime() + 30 * DAY)).length;
  const netRevenue30Days = Number(paymentTotals._sum.amount ?? 0) - Number(paymentTotals._sum.amountRefunded ?? 0);

  return {
    generatedAt: now.toISOString(),
    hotel: { name: hotel.name, currency: hotel.currency },
    summary: { roomCount, openReceivables: invoices.reduce((sum, invoice) => sum + Number(invoice.balanceAmount), 0), netRevenue30Days, pickup7Days: pickup, overdueTasks, openIncidents, lowStockItems: Number(lowStockRows[0]?.count ?? 0), averageResolutionHours: Number(averageResolutionHours.toFixed(1)) },
    roomStatus: Object.fromEntries(roomGroups.map((group) => [group.status, group._count])),
    sourceMix: sourceGroups.map((group) => ({ source: group.source, bookings: group._count })).sort((a, b) => b.bookings - a.bookings),
    forecast,
    receivablesAging: Object.fromEntries(Object.entries(aging).map(([key, value]) => [key, Number(value.toFixed(2))])),
    schedules: schedules.map((schedule) => ({ id: schedule.id, name: schedule.name, reportType: schedule.reportType, frequency: schedule.frequency, recipients: Array.isArray(schedule.recipients) ? schedule.recipients as string[] : [], active: schedule.active, nextRunAt: schedule.nextRunAt.toISOString(), lastRunAt: schedule.lastRunAt?.toISOString() })),
    recentRuns: runs.map((run) => ({ id: run.id, reportType: run.reportType, status: run.status, startedAt: run.startedAt.toISOString(), completedAt: run.completedAt?.toISOString(), error: run.error })),
  };
}

function nextOccurrence(value: Date, frequency: ReportFrequency) {
  const next = new Date(value);
  if (frequency === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
  if (frequency === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
  if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function nextFutureOccurrence(value: Date, frequency: ReportFrequency, now: Date) {
  let next = nextOccurrence(value, frequency);
  while (next <= now) next = nextOccurrence(next, frequency);
  return next;
}

export async function runScheduledReport(scheduleId: string) {
  const db = getDb();
  const schedule = await db.reportSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { hotel: true } });
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * DAY);
  const claimed = await db.reportSchedule.updateMany({ where: { id: schedule.id, active: true, nextRunAt: { lte: periodEnd } }, data: { lastRunAt: periodEnd, nextRunAt: nextFutureOccurrence(schedule.nextRunAt, schedule.frequency, periodEnd) } });
  if (claimed.count === 0) return "SKIPPED";
  const run = await db.reportRun.create({ data: { hotelId: schedule.hotelId, scheduleId: schedule.id, reportType: schedule.reportType, status: "RUNNING", periodStart, periodEnd } });
  try {
    const overview = await buildReportOverview(schedule.hotelId, periodEnd);
    const json = JSON.stringify(overview, null, 2);
    const bytes = new TextEncoder().encode(json);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    await db.$transaction(async (tx) => {
      await tx.document.create({ data: { hotelId: schedule.hotelId, title: `${schedule.name} · ${periodEnd.toISOString().slice(0, 10)}`, type: "AUDIT", linkedRef: run.id, fileName: `${schedule.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${periodEnd.toISOString().slice(0, 10)}.json`, mimeType: "application/json", storageKey: "POSTGRES", checksum, sizeBytes: bytes.byteLength, content: bytes, uploadedBy: "Scheduled reporting" } });
      await tx.reportRun.update({ where: { id: run.id }, data: { status: "COMPLETED", payload: JSON.parse(json) as Prisma.InputJsonValue, completedAt: new Date() } });
      const recipients = Array.isArray(schedule.recipients) ? schedule.recipients.filter((recipient): recipient is string => typeof recipient === "string") : [];
      if (recipients.length) await tx.communication.createMany({ data: recipients.map((recipient) => ({ hotelId: schedule.hotelId, channel: "EMAIL" as const, recipient, subject: `${schedule.hotel.name} · ${schedule.name}`, body: `The scheduled ${schedule.name} report completed. Reference: ${run.id}`, status: "DRAFT" as const, linkedRef: run.id, createdBy: "Scheduled reporting" })) });
    });
    return run.id;
  } catch (error) {
    await db.reportRun.update({ where: { id: run.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error", completedAt: new Date() } });
    throw error;
  }
}
