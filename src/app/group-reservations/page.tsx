"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";

export default function GroupReservationsPage() {
  const { state, createGroupReservation } = useHotel();
  const [form, setForm] = useState({
    groupName: "",
    companyName: "",
    roomCount: 10,
  });

  return (
    <AppShell
      activeHref="/group-reservations"
      eyebrow="Groups"
      title="Group blocks and corporate allocations"
      description="Manage group reservations, company-linked room blocks, and room demand planning for larger arrivals."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Create group block</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.groupName}
              onChange={(event) =>
                setForm((current) => ({ ...current, groupName: event.target.value }))
              }
              placeholder="Group name"
              className="suite-input"
            />
            <input
              value={form.companyName}
              onChange={(event) =>
                setForm((current) => ({ ...current, companyName: event.target.value }))
              }
              placeholder="Company name"
              className="suite-input"
            />
            <input
              type="number"
              value={form.roomCount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  roomCount: Number(event.target.value),
                }))
              }
              placeholder="Room count"
              className="suite-input"
            />
          </div>
          <button
            onClick={() => {
              if (!form.groupName || form.roomCount <= 0) return;
              createGroupReservation({
                ...form,
                companyName: form.companyName || undefined,
              });
              setForm({
                groupName: "",
                companyName: "",
                roomCount: 10,
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Create group reservation
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Active room blocks</h3>
          <div className="mt-4 space-y-3">
            {state.groupReservations.map((group) => (
              <article key={group.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{group.groupName}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {group.companyName || "No company linked"} • {group.roomCount} rooms
                </p>
                <p className="mt-3 text-sm text-[var(--ink-soft)]">
                  Bookings linked: {group.bookingCodes.length}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
