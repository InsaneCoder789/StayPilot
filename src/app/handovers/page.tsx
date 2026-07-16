"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { ShiftHandoverRecord } from "@/lib/hotel-data";

const departments: ShiftHandoverRecord["department"][] = [
  "FRONT_DESK",
  "HOUSEKEEPING",
  "MAINTENANCE",
];

export default function HandoversPage() {
  const { state, currentUser, createHandover } = useHotel();
  const [form, setForm] = useState({
    department: "FRONT_DESK" as ShiftHandoverRecord["department"],
    note: "",
    author: currentUser?.name ?? "Duty Manager",
  });

  return (
    <AppShell
      activeHref="/handovers"
      eyebrow="Handovers"
      title="Shift notes and duty continuity"
      description="Pass critical operational context between shifts for front desk, housekeeping, and maintenance teams."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Create shift handover</h3>
          <div className="mt-4 grid gap-3">
            <CustomSelect
              value={form.department}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  department: value as ShiftHandoverRecord["department"],
                }))
              }
              options={departments.map((item) => ({
                value: item,
                label: item.replaceAll("_", " "),
              }))}
            />
            <input
              value={form.author}
              onChange={(event) =>
                setForm((current) => ({ ...current, author: event.target.value }))
              }
              placeholder="Author"
              className="suite-input"
            />
            <textarea
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="Shift note"
              className="suite-input min-h-32"
            />
          </div>
          <button
            onClick={() => {
              if (!form.note) return;
              createHandover(form);
              setForm((current) => ({ ...current, note: "" }));
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Save handover
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Latest handovers</h3>
          <div className="mt-4 space-y-3">
            {state.handovers.map((item) => (
              <article key={item.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{item.department.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {item.author} • {item.createdAt}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
