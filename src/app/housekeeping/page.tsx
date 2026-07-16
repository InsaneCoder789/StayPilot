"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;

export default function HousekeepingPage() {
  const { state, updateHousekeepingStatus } = useHotel();

  return (
    <AppShell
      activeHref="/housekeeping"
      eyebrow="Housekeeping"
      title="Cleaning tasks and room readiness"
      description="Turn dirty rooms back into assignable inventory with live task updates."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        {state.housekeeping.map((task) => (
          <article
            key={task.id}
            className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                  Room {task.roomNumber}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {task.roomType} • Assigned to {task.assignee}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--ink-soft)]">
              Checkout {task.checkoutTime}
              {task.nextCheckInTime ? ` • Next arrival ${task.nextCheckInTime}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {statuses.map((status) => (
                <button
                  key={status}
                    onClick={() => updateHousekeepingStatus(task.id, status)}
                    className="suite-button suite-button-secondary"
                  >
                    {status.replaceAll("_", " ")}
                  </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
