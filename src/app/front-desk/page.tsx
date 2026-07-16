"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function FrontDeskPage() {
  const { state } = useHotel();
  const today = new Date().toISOString().slice(0, 10);
  const arrivals = state.bookings.filter((booking) => booking.checkIn === today);
  const departures = state.bookings.filter((booking) => booking.checkOut === today);

  return (
    <AppShell
      activeHref="/front-desk"
      eyebrow="Front Desk"
      title="Reception operations"
      description="Arrivals, departures, assignable rooms, and outstanding payment focus for the desk team."
    >
      <div className="grid gap-4 2xl:grid-cols-[1fr_1fr_0.9fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Arrivals</h3>
          <div className="mt-4 space-y-3">
            {arrivals.map((booking) => (
              <div key={booking.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{booking.guestName}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {booking.roomType} • {booking.source}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge value={booking.status} />
                  <StatusBadge value={booking.paymentStatus} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Departures</h3>
          <div className="mt-4 space-y-3">
            {departures.map((booking) => (
              <div key={booking.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{booking.guestName}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Room {booking.roomNumber ?? "Unassigned"} • {booking.roomType}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge value={booking.status} />
                  <StatusBadge value={booking.paymentStatus} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Assignable rooms</h3>
          <div className="mt-4 space-y-3">
            {state.rooms
              .filter((room) => room.status === "AVAILABLE" || room.status === "RESERVED")
              .slice(0, 12)
              .map((room) => (
                <div key={room.id} className="suite-subcard flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium">Room {room.roomNumber}</p>
                    <p className="text-sm text-[var(--muted)]">{room.roomType}</p>
                  </div>
                  <StatusBadge value={room.status} />
                </div>
              ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
