"use client";

import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { SuiteIcon } from "@/components/suite-icon";
import { getDashboardMetrics, getRoomStatusCounts } from "@/lib/hotel-data";

export default function DashboardPage() {
  const { state } = useHotel();
  const metrics = getDashboardMetrics(state);
  const roomCounts = getRoomStatusCounts(state.rooms);
  const capturedRevenue = state.payments
    .filter((payment) => payment.status === "CAPTURED")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const readiness = Math.round(
    ((roomCounts.available + roomCounts.occupied + roomCounts.reserved) /
      Math.max(state.rooms.length, 1)) *
      100,
  );

  return (
    <AppShell
      activeHref="/dashboard"
      eyebrow="Command center"
      title="The property, in one view."
      description={`${state.hotel.location}. Live rooms, guest movement, revenue, access, service tasks, and overnight controls for the entire hotel.`}
    >
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 2xl:grid-cols-12">
        <article className="suite-bezel 2xl:col-span-7 2xl:row-span-2">
          <div className="suite-core flex min-h-[34rem] flex-col">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="suite-eyebrow">Property pulse</span>
                <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                  {readiness}% of the hotel is operationally ready.
                </h2>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-black/15 px-5 py-4 text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                  Captured revenue
                </p>
                <p className="mt-2 font-mono text-2xl text-[var(--accent)] tabular-nums">
                  AED {capturedRevenue.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-10 grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Available", roomCounts.available, "AVAILABLE"],
                ["Occupied", roomCounts.occupied, "OCCUPIED"],
                ["Reserved", roomCounts.reserved, "RESERVED"],
                ["Needs action", roomCounts.dirty + roomCounts.maintenance, "DIRTY"],
              ].map(([label, value, status], index) => (
                <div
                  key={label}
                  className={`suite-subcard flex flex-col justify-between p-4 ${
                    index === 0 ? "col-span-2 row-span-2 sm:col-span-2" : ""
                  }`}
                >
                  <StatusBadge value={String(status)} />
                  <div className="mt-8">
                    <p className="font-mono text-4xl font-semibold tracking-[-0.06em] tabular-nums">
                      {value}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted)]">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/front-desk" className="suite-button suite-button-primary group">
                Open front desk
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                  <SuiteIcon name="arrow" className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link href="/blueprints" className="suite-button suite-button-secondary">
                View floor plans
              </Link>
            </div>
          </div>
        </article>

        <article className="suite-bezel 2xl:col-span-5">
          <div className="suite-core">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="suite-eyebrow">Movement</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  Front desk focus
                </h2>
              </div>
              <Link href="/bookings" className="suite-text-link">
                All reservations
                <SuiteIcon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            {state.bookings.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="The arrival board is clear"
                  description="New reservations, assigned rooms, and stay movement will appear here."
                  actionLabel="Create reservation"
                  actionHref="/bookings"
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-3">
                {state.bookings.slice(0, 4).map((booking) => (
                  <div key={booking.id} className="suite-subcard p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{booking.guestName}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {booking.code} • {booking.roomNumber ? `Room ${booking.roomNumber}` : booking.roomType}
                        </p>
                      </div>
                      <StatusBadge value={booking.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        <article className="suite-bezel 2xl:col-span-5">
          <div className="suite-core">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="suite-eyebrow">Money desk</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  Revenue controls
                </h2>
              </div>
              <StatusBadge value={state.invoices.some((item) => item.balanceAmount > 0) ? "PENDING" : "READY"} />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link href="/billing" className="suite-subcard group p-4">
                <SuiteIcon name="document" className="h-5 w-5 text-[var(--accent)]" />
                <p className="mt-8 font-medium">Invoice studio</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{state.invoices.length} issued</p>
              </Link>
              <Link href="/payments" className="suite-subcard group p-4">
                <SuiteIcon name="wallet" className="h-5 w-5 text-[var(--accent)]" />
                <p className="mt-8 font-medium">Payment terminal</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{state.payments.length} transactions</p>
              </Link>
              <Link href="/receipts" className="suite-subcard group col-span-2 p-4">
                <div className="flex items-start justify-between">
                  <SuiteIcon name="receipt" className="h-5 w-5 text-[var(--accent)]" />
                  <p className="font-mono text-xl tabular-nums">{state.receipts.length}</p>
                </div>
                <p className="mt-6 font-medium">Receipt gateway</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Printable proof for every captured payment</p>
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,.85fr)]">
        <article className="suite-bezel">
          <div className="suite-core">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="suite-eyebrow">Department queue</span>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  Work requiring attention
                </h2>
              </div>
              <p className="text-xs text-[var(--muted)]">
                {state.housekeeping.length + state.maintenance.length + state.complaints.length} open records
              </p>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {state.housekeeping.slice(0, 3).map((task) => (
                <div key={task.id} className="suite-subcard p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Housekeeping</p>
                  <p className="mt-2 font-medium">Room {task.roomNumber}</p>
                  <div className="mt-4 flex gap-2">
                    <StatusBadge value={task.priority} />
                    <StatusBadge value={task.status} />
                  </div>
                </div>
              ))}
              {state.maintenance.slice(0, 3).map((ticket) => (
                <div key={ticket.id} className="suite-subcard p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Engineering</p>
                  <p className="mt-2 font-medium">{ticket.title}</p>
                  <div className="mt-4 flex gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                  </div>
                </div>
              ))}
              {state.housekeeping.length + state.maintenance.length === 0 ? (
                <div className="md:col-span-2">
                  <EmptyState
                    title="No department tasks are waiting"
                    description="Housekeeping turnover and engineering requests will collect here as the property starts operating."
                  />
                </div>
              ) : null}
            </div>
          </div>
        </article>

        <article className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Security</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              Access and alerts
            </h2>
            <div className="mt-6 grid gap-3">
              <Link href="/access-tracker" className="suite-subcard flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <SuiteIcon name="key" className="h-5 w-5 text-[var(--accent)]" />
                  <span className="text-sm">NFC access events</span>
                </div>
                <span className="font-mono text-lg tabular-nums">{state.nfcEvents.length}</span>
              </Link>
              <Link href="/notifications" className="suite-subcard flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <SuiteIcon name="bell" className="h-5 w-5 text-[var(--accent)]" />
                  <span className="text-sm">Unread alerts</span>
                </div>
                <span className="font-mono text-lg tabular-nums">
                  {state.notifications.filter((item) => !item.read).length}
                </span>
              </Link>
              <Link href="/night-audit" className="suite-subcard flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <SuiteIcon name="moon" className="h-5 w-5 text-[var(--accent)]" />
                  <span className="text-sm">Completed night audits</span>
                </div>
                <span className="font-mono text-lg tabular-nums">
                  {state.nightAudits.filter((item) => item.status === "COMPLETED").length}
                </span>
              </Link>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
