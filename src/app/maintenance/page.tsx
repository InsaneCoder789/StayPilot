"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { Priority } from "@/lib/hotel-data";

const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function MaintenancePage() {
  const { state, createMaintenanceTicket, updateMaintenanceStatus } = useHotel();
  const [form, setForm] = useState({
    roomNumber: "",
    title: "",
    category: "HVAC",
    assignee: "",
    priority: "MEDIUM" as Priority,
    description: "",
  });

  return (
    <AppShell
      activeHref="/maintenance"
      eyebrow="Maintenance"
      title="Engineering and room recovery"
      description="Create tickets, block affected rooms, and release them back to operations after repair."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.3fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            New maintenance ticket
          </h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.roomNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, roomNumber: event.target.value }))
              }
              placeholder="Room number"
              className="suite-input"
            />
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Issue title"
              className="suite-input"
            />
            <input
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
              placeholder="Category"
              className="suite-input"
            />
            <input
              value={form.assignee}
              onChange={(event) =>
                setForm((current) => ({ ...current, assignee: event.target.value }))
              }
              placeholder="Assigned technician"
              className="suite-input"
            />
            <CustomSelect
              value={form.priority}
              onChange={(value) =>
                setForm((current) => ({ ...current, priority: value as Priority }))
              }
              options={priorities.map((priority) => ({
                value: priority,
                label: priority,
              }))}
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Description"
              className="suite-input min-h-28"
            />
          </div>
          <button
            onClick={() => {
              createMaintenanceTicket(form);
              setForm({
                roomNumber: "",
                title: "",
                category: "HVAC",
                assignee: "",
                priority: "MEDIUM",
                description: "",
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Create ticket
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Active tickets
          </h3>
          <div className="mt-4 space-y-3">
            {state.maintenance.map((ticket) => (
              <div
                key={ticket.id}
                className="suite-subcard px-4 py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium">{ticket.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {ticket.category}
                      {ticket.roomNumber ? ` • Room ${ticket.roomNumber}` : ""}
                      {" • "}
                      {ticket.assignee || "Unassigned"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                      {ticket.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={ticket.priority} />
                    <StatusBadge value={ticket.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {["OPEN", "IN_PROGRESS", "RESOLVED"].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        updateMaintenanceStatus(
                          ticket.id,
                          status as "OPEN" | "IN_PROGRESS" | "RESOLVED",
                        )
                      }
                      className="suite-button suite-button-secondary"
                    >
                      {status.replaceAll("_", " ")}
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
