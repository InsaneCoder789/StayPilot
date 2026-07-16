"use client";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { RoomStatus } from "@/lib/hotel-data";

const roomStatuses: RoomStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "DIRTY",
  "CLEANING",
  "MAINTENANCE",
  "BLOCKED",
];

export default function RoomsPage() {
  const { state, setRoomStatus } = useHotel();

  return (
    <AppShell
      activeHref="/rooms"
      eyebrow="Rooms"
      title="Live room control"
      description="Update room readiness, review occupancy, and keep assignable inventory accurate in real time."
    >
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {state.rooms.map((room) => (
          <article key={room.id} className="suite-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[var(--muted)]">
                  Room {room.roomNumber}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                  {room.roomType}
                </h3>
              </div>
              <StatusBadge value={room.status} />
            </div>

            <div className="mt-4 space-y-3 text-sm text-[var(--ink-soft)]">
              <div className="suite-subcard px-4 py-3">
                Floor {room.floor} • Capacity {room.capacity}
              </div>
              {room.guestName ? (
                <div className="suite-subcard px-4 py-3">
                  Guest: {room.guestName}
                </div>
              ) : null}
              {room.nextBooking ? (
                <div className="suite-subcard px-4 py-3">
                  {room.nextBooking}
                </div>
              ) : null}
              {room.housekeepingNote ? (
                <div className="suite-subcard px-4 py-3">
                  {room.housekeepingNote}
                </div>
              ) : null}
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                Change status
              </span>
              <CustomSelect
                value={room.status}
                onChange={(value) => setRoomStatus(room.id, value as RoomStatus)}
                options={roomStatuses.map((status) => ({
                  value: status,
                  label: status.replaceAll("_", " "),
                }))}
              />
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
