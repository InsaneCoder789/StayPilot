"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { VendorRecord } from "@/lib/hotel-data";

const categories: VendorRecord["category"][] = [
  "HVAC",
  "PLUMBING",
  "LINEN",
  "IT",
  "SUPPLIER",
];

export default function VendorsPage() {
  const { state, addVendor } = useHotel();
  const [form, setForm] = useState({
    name: "",
    category: "SUPPLIER" as VendorRecord["category"],
    contact: "",
    sla: "",
  });

  return (
    <AppShell
      activeHref="/vendors"
      eyebrow="Vendors"
      title="Vendor and SLA management"
      description="Track approved service partners, supplier contacts, and response expectations for hotel operations."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Add vendor</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Vendor name"
              className="suite-input"
            />
            <CustomSelect
              value={form.category}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  category: value as VendorRecord["category"],
                }))
              }
              options={categories.map((item) => ({ value: item, label: item }))}
            />
            <input
              value={form.contact}
              onChange={(event) =>
                setForm((current) => ({ ...current, contact: event.target.value }))
              }
              placeholder="Contact"
              className="suite-input"
            />
            <input
              value={form.sla}
              onChange={(event) =>
                setForm((current) => ({ ...current, sla: event.target.value }))
              }
              placeholder="SLA"
              className="suite-input"
            />
          </div>
          <button
            onClick={() => {
              if (!form.name || !form.contact) return;
              addVendor(form);
              setForm({
                name: "",
                category: "SUPPLIER",
                contact: "",
                sla: "",
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Save vendor
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Approved vendors</h3>
          <div className="mt-4 space-y-3">
            {state.vendors.map((vendor) => (
              <article key={vendor.id} className="suite-subcard px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-medium">{vendor.name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {vendor.category} • {vendor.contact}
                    </p>
                  </div>
                  <div className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)]">
                    SLA {vendor.sla}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
