"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { BlueprintZoneRecord } from "@/lib/hotel-data";
import { cn } from "@/lib/utils";

const zoneTypes: BlueprintZoneRecord["type"][] = [
  "ROOM",
  "LOBBY",
  "SERVICE",
  "STAIR",
  "LIFT",
  "AMENITY",
];

const zoneStyles: Record<BlueprintZoneRecord["type"], string> = {
  ROOM: "border-[rgba(224,183,104,.16)] bg-[rgba(224,183,104,.06)]",
  LOBBY: "border-[rgba(114,183,151,.17)] bg-[rgba(114,183,151,.06)]",
  SERVICE: "border-white/[.08] bg-white/[.025]",
  STAIR: "border-[rgba(133,158,181,.16)] bg-[rgba(133,158,181,.05)]",
  LIFT: "border-[rgba(133,158,181,.2)] bg-[rgba(133,158,181,.08)]",
  AMENITY: "border-[rgba(215,131,118,.16)] bg-[rgba(215,131,118,.05)]",
};

export default function BlueprintsPage() {
  const { state, addBlueprintZone, removeBlueprintZone } = useHotel();
  const [floor, setFloor] = useState("1");
  const [form, setForm] = useState({
    label: "",
    type: "SERVICE" as BlueprintZoneRecord["type"],
    linkedRoomNumber: "",
  });
  const blueprint = state.blueprints.find((item) => item.floor === Number(floor));
  const floorRooms = state.rooms.filter((room) => room.floor === Number(floor));

  return (
    <AppShell
      activeHref="/blueprints"
      eyebrow="Property design"
      title="Hotel blueprint creator"
      description="Build an operating map for every floor, connect rooms to live status data, and add service, lift, stair, lobby, and amenity zones."
    >
      <section className="grid gap-6 2xl:grid-cols-[minmax(18rem,.32fr)_minmax(0,.68fr)]">
        <aside className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Plan controls</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              Configure floor
            </h2>
            <div className="mt-6 grid gap-4">
              <label>
                <span className="suite-label">Active floor</span>
                <CustomSelect
                  value={floor}
                  onChange={setFloor}
                  options={state.blueprints.map((item) => ({
                    value: String(item.floor),
                    label: `Floor ${item.floor} • ${item.zones.length} zones`,
                  }))}
                />
              </label>
              <label>
                <span className="suite-label">Zone label</span>
                <input
                  value={form.label}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, label: event.target.value }))
                  }
                  placeholder="Laundry store, service lift..."
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Zone type</span>
                <CustomSelect
                  value={form.type}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      type: value as BlueprintZoneRecord["type"],
                    }))
                  }
                  options={zoneTypes.map((type) => ({ value: type, label: type }))}
                />
              </label>
              <label>
                <span className="suite-label">Linked room</span>
                <CustomSelect
                  value={form.linkedRoomNumber}
                  onChange={(value) =>
                    setForm((current) => ({ ...current, linkedRoomNumber: value }))
                  }
                  placeholder="No room link"
                  options={[
                    { value: "", label: "No room link" },
                    ...floorRooms.map((room) => ({
                      value: room.roomNumber,
                      label: `Room ${room.roomNumber}`,
                    })),
                  ]}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!blueprint || !form.label.trim()) return;
                  addBlueprintZone({
                    blueprintId: blueprint.id,
                    label: form.label.trim(),
                    type: form.type,
                    linkedRoomNumber: form.linkedRoomNumber || undefined,
                  });
                  setForm({
                    label: "",
                    type: "SERVICE",
                    linkedRoomNumber: "",
                  });
                }}
                className="suite-button suite-button-primary"
              >
                Add zone to blueprint
              </button>
            </div>
            <div className="suite-subcard mt-6 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                Plan record
              </p>
              <p className="mt-2 text-sm">{blueprint?.name}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Updated {blueprint?.updatedAt}
              </p>
            </div>
          </div>
        </aside>

        <div className="suite-bezel">
          <div className="suite-core">
            <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="suite-eyebrow">Floor {floor}</span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
                  Operating plan
                </h2>
              </div>
              <p className="text-sm text-[var(--muted)]">
                {blueprint?.zones.length ?? 0} mapped zones
              </p>
            </div>

            <div className="mt-7 grid auto-rows-[8.5rem] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {blueprint?.zones.map((zone, index) => {
                const room = state.rooms.find(
                  (item) => item.roomNumber === zone.linkedRoomNumber,
                );
                return (
                  <article
                    key={zone.id}
                    className={cn(
                      "group relative flex flex-col justify-between overflow-hidden rounded-[1.35rem] border p-4 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1",
                      zoneStyles[zone.type],
                      index % 7 === 0 && "sm:col-span-2",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                          {zone.type}
                        </p>
                        <h3 className="mt-2 font-medium">{zone.label}</h3>
                      </div>
                      {room ? <StatusBadge value={room.status} /> : null}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-xs text-[var(--muted)]">
                        {room
                          ? `${room.roomType} • Capacity ${room.capacity}`
                          : "Operational zone"}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          blueprint && removeBlueprintZone(blueprint.id, zone.id)
                        }
                        className="translate-y-2 text-xs text-[var(--muted)] opacity-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-y-0 group-hover:opacity-100"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
