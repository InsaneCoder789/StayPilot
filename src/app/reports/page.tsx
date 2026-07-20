"use client";

import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { StatusBadge } from "@/components/status-badge";

type ReportData = {
  generatedAt: string;
  hotel: { name: string; currency: string };
  summary: { roomCount: number; openReceivables: number; netRevenue30Days: number; pickup7Days: number; overdueTasks: number; openIncidents: number; lowStockItems: number; averageResolutionHours: number };
  roomStatus: Record<string, number>;
  sourceMix: Array<{ source: string; bookings: number }>;
  forecast: Array<{ date: string; occupiedRooms: number; availableRooms: number; occupancyPercent: number }>;
  receivablesAging: Record<string, number>;
  schedules: Array<{ id: string; name: string; reportType: string; frequency: string; recipients: string[]; active: boolean; nextRunAt: string; lastRunAt?: string }>;
  recentRuns: Array<{ id: string; reportType: string; status: string; startedAt: string; completedAt?: string; error?: string }>;
};

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState({ name: "Daily management pack", reportType: "MANAGEMENT_OVERVIEW", frequency: "DAILY", recipients: "", nextRunAt: "" });

  async function refresh() {
    const response = await fetch("/api/reports/overview", { cache: "no-store" });
    const body = await response.json() as { report?: ReportData; ok: boolean };
    if (body.report) setReport(body.report);
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/reports/overview", { cache: "no-store" })
      .then((response) => response.json() as Promise<{ report?: ReportData }>)
      .then((body) => { if (active && body.report) setReport(body.report); });
    return () => { active = false; };
  }, []);

  return (
    <AppShell activeHref="/reports" eyebrow="Intelligence" title="Management intelligence and forecasting" description="Server-calculated occupancy, pickup, net revenue, receivables aging, service SLA, scheduled packs, and exportable management datasets.">
      {!report ? <div className="suite-card p-8 text-sm text-[var(--muted)]">Calculating property intelligence from PostgreSQL...</div> : <>
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{[
          ["Net revenue · 30d", `${report.hotel.currency} ${report.summary.netRevenue30Days.toFixed(2)}`, "Captured less refunds"],
          ["Open receivables", `${report.hotel.currency} ${report.summary.openReceivables.toFixed(2)}`, "Outstanding folios"],
          ["Pickup · 7d", report.summary.pickup7Days, "Next 30-day arrivals"],
          ["Average resolution", `${report.summary.averageResolutionHours}h`, `${report.summary.overdueTasks} overdue tasks`],
        ].map(([label, value, helper]) => <div key={label} className="suite-card p-5"><p className="suite-label">{label}</p><p className="mt-3 font-mono text-2xl font-semibold">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{helper}</p></div>)}</section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <div className="suite-card p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="suite-eyebrow">Forward view</span><h2 className="mt-4 text-2xl font-semibold">14-day occupancy forecast</h2></div><a href="/api/reports/export?dataset=forecast" className="suite-button suite-button-secondary">Export forecast CSV</a></div><div className="mt-6 grid grid-cols-7 gap-2">{report.forecast.map((day) => <div key={day.date} className="suite-subcard flex min-h-40 flex-col justify-between p-3"><div><p className="text-[10px] text-[var(--muted)]">{day.date.slice(5)}</p><p className="mt-2 font-mono text-xl font-semibold">{day.occupancyPercent}%</p></div><div><div className="h-16 overflow-hidden rounded-full bg-black/20"><div className="mt-auto w-full bg-[var(--accent)]" style={{ height: `${Math.max(day.occupancyPercent, 3)}%` }} /></div><p className="mt-2 text-[10px] text-[var(--muted)]">{day.occupiedRooms}/{report.summary.roomCount}</p></div></div>)}</div></div>
          <div className="suite-card p-6"><div className="flex items-end justify-between gap-3"><div><span className="suite-eyebrow">Collections</span><h2 className="mt-4 text-2xl font-semibold">Receivables aging</h2></div><a href="/api/reports/export?dataset=aging" className="suite-text-link">CSV</a></div><div className="mt-5 grid gap-3">{Object.entries(report.receivablesAging).map(([bucket, amount]) => <div key={bucket} className="suite-subcard flex items-center justify-between p-4"><span className="text-sm capitalize text-[var(--muted)]">{bucket.replace(/days|to/g, " ")}</span><span className="font-mono">{report.hotel.currency} {amount.toFixed(2)}</span></div>)}</div></div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="suite-card p-6"><span className="suite-eyebrow">Demand channels</span><h2 className="mt-4 text-2xl font-semibold">30-day source mix</h2><div className="mt-5 grid gap-3">{report.sourceMix.map((item) => <div key={item.source} className="suite-subcard flex items-center justify-between p-4"><span className="truncate text-sm">{item.source}</span><span className="font-mono">{item.bookings}</span></div>)}</div><a href="/api/reports/export?dataset=sources" className="suite-button suite-button-secondary mt-4">Export source CSV</a></div>
          <div className="suite-card p-6"><span className="suite-eyebrow">Automate</span><h2 className="mt-4 text-2xl font-semibold">Schedule report pack</h2><div className="mt-5 grid gap-3"><input className="suite-input" value={schedule.name} onChange={(event) => setSchedule((current) => ({ ...current, name: event.target.value }))} /><CustomSelect value={schedule.reportType} onChange={(value) => setSchedule((current) => ({ ...current, reportType: value }))} options={["MANAGEMENT_OVERVIEW", "REVENUE", "OPERATIONS", "RECEIVABLES"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} /><CustomSelect value={schedule.frequency} onChange={(value) => setSchedule((current) => ({ ...current, frequency: value }))} options={["DAILY", "WEEKLY", "MONTHLY"].map((value) => ({ value, label: value }))} /><input type="datetime-local" className="suite-input" value={schedule.nextRunAt} onChange={(event) => setSchedule((current) => ({ ...current, nextRunAt: event.target.value }))} /><input className="suite-input" value={schedule.recipients} onChange={(event) => setSchedule((current) => ({ ...current, recipients: event.target.value }))} placeholder="Recipient emails, comma separated" /><button className="suite-button suite-button-primary" onClick={async () => { if (!schedule.nextRunAt) { setMessage("Choose the first run time."); return; } const response = await fetch("/api/reports/schedules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...schedule, recipients: schedule.recipients.split(",").map((item) => item.trim()).filter(Boolean), nextRunAt: new Date(schedule.nextRunAt).toISOString() }) }); const body = await response.json() as { message?: string }; setMessage(body.message ?? "Schedule could not be created."); if (response.ok) await refresh(); }}>Create schedule</button>{message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}</div></div>
          <div className="suite-card p-6"><span className="suite-eyebrow">Automation ledger</span><h2 className="mt-4 text-2xl font-semibold">Schedules and runs</h2><div className="mt-5 grid gap-3">{report.schedules.slice(0, 5).map((item) => <article key={item.id} className="suite-subcard p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.frequency} · next {new Date(item.nextRunAt).toLocaleString()}</p></div><StatusBadge value={item.active ? "ACTIVE" : "DISABLED"} /></div></article>)}{report.recentRuns.slice(0, 5).map((run) => <article key={run.id} className="suite-subcard flex items-center justify-between gap-3 p-4"><div><p className="text-sm">{run.reportType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">{new Date(run.startedAt).toLocaleString()}</p></div><StatusBadge value={run.status} /></article>)}</div></div>
        </section>
        <p className="mt-4 text-right text-xs text-[var(--muted)]">Calculated server-side at {new Date(report.generatedAt).toLocaleString()}</p>
      </>}
    </AppShell>
  );
}
