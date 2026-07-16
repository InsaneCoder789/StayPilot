"use client";

import { AppShell } from "@/components/app-shell";
import { StatCard } from "@/components/stat-card";
import { useHotel } from "@/components/hotel-provider";
import { getRoomStatusCounts } from "@/lib/hotel-data";

export default function ReportsPage() {
  const { state } = useHotel();
  const roomCounts = getRoomStatusCounts(state.rooms);
  const sourceMix = Object.entries(
    state.bookings.reduce<Record<string, number>>((acc, booking) => {
      acc[booking.source] = (acc[booking.source] ?? 0) + 1;
      return acc;
    }, {}),
  );
  const floorMix = Object.entries(
    state.rooms.reduce<Record<string, number>>((acc, room) => {
      acc[`Floor ${room.floor}`] = (acc[`Floor ${room.floor}`] ?? 0) + 1;
      return acc;
    }, {}),
  ).slice(0, 10);
  const lowStockItems = state.inventory.filter((item) => item.stockOnHand <= item.reorderLevel);
  const integrationSummary = state.integrations.filter((item) => item.enabled);

  return (
    <AppShell
      activeHref="/reports"
      eyebrow="Reports"
      title="Operational reporting and performance"
      description="Track occupancy, source mix, financial status, and floor-level distribution from one management view."
    >
      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          label="Total Rooms"
          value={`${state.rooms.length}`}
          helper="Configured inventory"
        />
        <StatCard
          label="Open Invoices"
          value={`${state.invoices.filter((invoice) => invoice.balanceAmount > 0).length}`}
          helper="Needs payment follow-up"
        />
        <StatCard
          label="Complaints"
          value={`${state.complaints.length}`}
          helper="Current service queue"
        />
        <StatCard
          label="Room Cards"
          value={`${state.roomCards.filter((card) => card.status === "ACTIVE").length}`}
          helper="Active issued cards"
        />
      </section>

      <section className="mt-6 grid gap-4 2xl:grid-cols-[1fr_1fr_1fr]">
        <div className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Room status mix</h3>
          <div className="mt-4 space-y-3">
            {Object.entries(roomCounts).map(([label, count]) => (
              <div key={label} className="suite-subcard flex items-center justify-between px-4 py-3">
                <span className="text-sm capitalize text-[var(--ink-soft)]">{label}</span>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Booking sources</h3>
          <div className="mt-4 space-y-3">
            {sourceMix.map(([source, count]) => (
              <div key={source} className="suite-subcard flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[var(--ink-soft)]">{source}</span>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Floor distribution</h3>
          <div className="mt-4 space-y-3">
            {floorMix.map(([floor, count]) => (
              <div key={floor} className="suite-subcard flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[var(--ink-soft)]">{floor}</span>
                <span className="text-lg font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 2xl:grid-cols-[1fr_1fr]">
        <div className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Inventory pressure</h3>
          <div className="mt-4 space-y-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="suite-subcard flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[var(--ink-soft)]">{item.name}</span>
                <span className="text-lg font-semibold">
                  {item.stockOnHand}/{item.reorderLevel}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Connected systems</h3>
          <div className="mt-4 space-y-3">
            {integrationSummary.map((item) => (
              <div key={item.id} className="suite-subcard flex items-center justify-between px-4 py-3">
                <span className="text-sm text-[var(--ink-soft)]">{item.name}</span>
                <span className="text-lg font-semibold">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
