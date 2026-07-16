"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function RoomCardsPage() {
  const { state, issueRoomCard, updateRoomCardStatus } = useHotel();
  const [roomNumber, setRoomNumber] = useState(state.rooms[0]?.roomNumber ?? "");
  const [accessType, setAccessType] = useState<"NFC" | "RFID" | "MAGSTRIPE">("NFC");
  const [guestName, setGuestName] = useState("");

  return (
    <AppShell
      activeHref="/room-cards"
      eyebrow="Room Cards"
      title="Room card and NFC access control"
      description="Issue digital and physical room credentials, track active cards, and expire access when a stay ends."
    >
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.3fr]">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Issue room card</h3>
          <div className="mt-4 grid gap-3">
            <CustomSelect
              value={roomNumber}
              onChange={setRoomNumber}
              options={state.rooms.slice(0, 100).map((room) => ({
                value: room.roomNumber,
                label: `Room ${room.roomNumber} • ${room.roomType}`,
              }))}
            />
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Guest name"
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 outline-none"
            />
            <CustomSelect
              value={accessType}
              onChange={(value) => setAccessType(value as "NFC" | "RFID" | "MAGSTRIPE")}
              options={[
                { value: "NFC", label: "NFC card" },
                { value: "RFID", label: "RFID key" },
                { value: "MAGSTRIPE", label: "Magstripe card" },
              ]}
            />
          </div>
          <button
            onClick={() => issueRoomCard({ roomNumber, guestName, accessType })}
            className="mt-4 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-[#111111]"
          >
            Issue room card
          </button>
        </section>
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface-strong)] p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Card inventory</h3>
          <div className="mt-4 space-y-3">
            {state.roomCards.map((card) => (
              <div key={card.id} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-medium">Room {card.roomNumber}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {card.guestName || "No guest attached"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={card.accessType} />
                    <StatusBadge value={card.status} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {["READY", "ENCODED", "ACTIVE", "EXPIRED"].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        updateRoomCardStatus(
                          card.id,
                          status as "READY" | "ENCODED" | "ACTIVE" | "EXPIRED",
                        )
                      }
                      className="rounded-full border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm"
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
