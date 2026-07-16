"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { Priority, StaffRole } from "@/lib/hotel-data";

const severityOptions: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const audienceOptions: Array<StaffRole | "ALL"> = [
  "ALL",
  "HOTEL_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "HOUSEKEEPING",
  "MAINTENANCE",
  "ACCOUNTANT",
];

export default function NotificationsPage() {
  const { state, addNotification, markNotificationRead } = useHotel();
  const [form, setForm] = useState({
    title: "",
    message: "",
    severity: "MEDIUM" as Priority,
    audience: "ALL" as StaffRole | "ALL",
  });

  const unreadCount = state.notifications.filter((item) => !item.read).length;

  return (
    <AppShell
      activeHref="/notifications"
      eyebrow="Notifications"
      title="Alerts and team broadcasting"
      description="Create in-house operational alerts, notify departments, and clear the action queue from one control center."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Broadcast alert</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Alert title"
              className="suite-input"
            />
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              placeholder="Message"
              className="suite-input min-h-32"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <CustomSelect
                value={form.severity}
                onChange={(value) =>
                  setForm((current) => ({ ...current, severity: value as Priority }))
                }
                options={severityOptions.map((item) => ({ value: item, label: item }))}
              />
              <CustomSelect
                value={form.audience}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    audience: value as StaffRole | "ALL",
                  }))
                }
                options={audienceOptions.map((item) => ({
                  value: item,
                  label: item.replaceAll("_", " "),
                }))}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (!form.title || !form.message) return;
              addNotification(form);
              setForm({
                title: "",
                message: "",
                severity: "MEDIUM",
                audience: "ALL",
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Send alert
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Live queue</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="suite-subcard px-4 py-4 text-sm">Total alerts: {state.notifications.length}</div>
            <div className="suite-subcard px-4 py-4 text-sm">Unread: {unreadCount}</div>
            <div className="suite-subcard px-4 py-4 text-sm">
              Urgent: {state.notifications.filter((item) => item.severity === "URGENT").length}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {state.notifications.map((item) => (
              <article key={item.id} className="suite-subcard px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.audience.replaceAll("_", " ")} • {item.createdAt}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{item.message}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={item.severity} />
                    <StatusBadge value={item.read ? "READ" : "UNREAD"} />
                  </div>
                </div>
                {!item.read ? (
                  <button
                    onClick={() => markNotificationRead(item.id)}
                    className="suite-button suite-button-secondary mt-4"
                  >
                    Mark as read
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
