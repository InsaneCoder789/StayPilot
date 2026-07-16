"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function ServiceOpsPage() {
  const { state } = useHotel();
  const vipGuests = state.guests.filter((guest) => guest.vipStatus);
  const upcomingCards = state.roomCards.filter((card) => card.status === "READY" || card.status === "ENCODED");
  const priorityTasks = state.housekeeping.filter((task) => task.priority === "HIGH" || task.priority === "URGENT");

  return (
    <AppShell
      activeHref="/service-ops"
      eyebrow="Service Ops"
      title="Cross-department service control"
      description="A single operational layer for VIP handling, priority turnovers, access readiness, and active guest issues."
    >
      <div className="grid gap-4 2xl:grid-cols-[1fr_1fr_1fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">VIP guests</h3>
          <div className="mt-4 space-y-3">
            {vipGuests.map((guest) => (
              <div key={guest.id} className="suite-subcard px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {guest.firstName} {guest.lastName}
                    </p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {guest.preferences.join(", ")}
                    </p>
                  </div>
                  <StatusBadge value="HIGH" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Priority turnovers</h3>
          <div className="mt-4 space-y-3">
            {priorityTasks.map((task) => (
              <div key={task.id} className="suite-subcard px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Room {task.roomNumber}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {task.assignee} • Next arrival {task.nextCheckInTime ?? "Not scheduled"}
                    </p>
                  </div>
                  <StatusBadge value={task.priority} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Access readiness</h3>
          <div className="mt-4 space-y-3">
            {upcomingCards.slice(0, 8).map((card) => (
              <div key={card.id} className="suite-subcard px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Room {card.roomNumber}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{card.accessType}</p>
                  </div>
                  <StatusBadge value={card.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
