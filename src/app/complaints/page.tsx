"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function ComplaintsPage() {
  const { state, createComplaint, updateComplaintStatus } = useHotel();
  const [form, setForm] = useState({
    guestName: "",
    roomNumber: "",
    message: "",
  });

  return (
    <AppShell
      activeHref="/complaints"
      eyebrow="Complaints"
      title="Guest complaints and service requests"
      description="Capture issues, route them to the right department, and close the loop from one screen."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.3fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Log complaint
          </h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.guestName}
              onChange={(event) =>
                setForm((current) => ({ ...current, guestName: event.target.value }))
              }
              placeholder="Guest name"
              className="suite-input"
            />
            <input
              value={form.roomNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, roomNumber: event.target.value }))
              }
              placeholder="Room number"
              className="suite-input"
            />
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Describe the issue"
              className="suite-input min-h-32"
            />
          </div>
          <button
            onClick={() => {
              createComplaint(form);
              setForm({ guestName: "", roomNumber: "", message: "" });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Create complaint
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Open queue
          </h3>
          <div className="mt-4 space-y-3">
            {state.complaints.map((complaint) => (
              <div
                key={complaint.id}
                className="suite-subcard px-4 py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium">{complaint.guestName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {complaint.category} • {complaint.department}
                      {complaint.roomNumber ? ` • Room ${complaint.roomNumber}` : ""}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                      {complaint.message}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={complaint.priority} />
                    <StatusBadge value={complaint.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {["OPEN", "ACKNOWLEDGED", "RESOLVED"].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        updateComplaintStatus(
                          complaint.id,
                          status as "OPEN" | "ACKNOWLEDGED" | "RESOLVED",
                        )
                      }
                      className="suite-button suite-button-secondary"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
