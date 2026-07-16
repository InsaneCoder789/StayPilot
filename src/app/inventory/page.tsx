"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { InventoryItemRecord } from "@/lib/hotel-data";

const categories: InventoryItemRecord["category"][] = [
  "LINEN",
  "AMENITY",
  "MINIBAR",
  "HOUSEKEEPING",
  "ENGINEERING",
];

export default function InventoryPage() {
  const { state, addInventoryItem, adjustInventoryItem } = useHotel();
  const [form, setForm] = useState({
    name: "",
    category: "LINEN" as InventoryItemRecord["category"],
    stockOnHand: 0,
    reorderLevel: 0,
    vendorName: "",
  });

  const lowStockItems = state.inventory.filter(
    (item) => item.stockOnHand <= item.reorderLevel,
  );

  return (
    <AppShell
      activeHref="/inventory"
      eyebrow="Inventory"
      title="Operating stock and reorder control"
      description="Monitor linen, amenities, minibar, engineering stock, and reorder pressure without leaving the suite."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Add stock item</h3>
          <div className="mt-4 grid gap-3">
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Item name"
              className="suite-input"
            />
            <CustomSelect
              value={form.category}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  category: value as InventoryItemRecord["category"],
                }))
              }
              options={categories.map((item) => ({ value: item, label: item }))}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="number"
                value={form.stockOnHand}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stockOnHand: Number(event.target.value),
                  }))
                }
                placeholder="Stock on hand"
                className="suite-input"
              />
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reorderLevel: Number(event.target.value),
                  }))
                }
                placeholder="Reorder level"
                className="suite-input"
              />
            </div>
            <input
              value={form.vendorName}
              onChange={(event) =>
                setForm((current) => ({ ...current, vendorName: event.target.value }))
              }
              placeholder="Vendor name"
              className="suite-input"
            />
          </div>
          <button
            onClick={() => {
              if (!form.name) return;
              addInventoryItem({
                ...form,
                vendorName: form.vendorName || undefined,
              });
              setForm({
                name: "",
                category: "LINEN",
                stockOnHand: 0,
                reorderLevel: 0,
                vendorName: "",
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Add inventory item
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Stock position</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="suite-subcard px-4 py-4 text-sm">Items tracked: {state.inventory.length}</div>
            <div className="suite-subcard px-4 py-4 text-sm">Low stock: {lowStockItems.length}</div>
            <div className="suite-subcard px-4 py-4 text-sm">
              Vendors linked: {state.inventory.filter((item) => item.vendorName).length}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {state.inventory.map((item) => (
              <article key={item.id} className="suite-subcard px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.category} {item.vendorName ? `• ${item.vendorName}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-[var(--line)] px-3 py-2">
                      Stock {item.stockOnHand}
                    </span>
                    <span className="rounded-full border border-[var(--line)] px-3 py-2">
                      Reorder {item.reorderLevel}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {[item.reorderLevel, item.reorderLevel + 10, item.reorderLevel + 50].map(
                    (nextValue) => (
                      <button
                        key={`${item.id}-${nextValue}`}
                        onClick={() => adjustInventoryItem(item.id, nextValue)}
                        className="suite-button suite-button-secondary"
                      >
                        Set {nextValue}
                      </button>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
