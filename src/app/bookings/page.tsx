"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

const sources = ["WEBSITE", "PHONE", "WALK_IN", "OTA", "CORPORATE"];
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

export default function BookingsPage() {
  const { state, createBooking, checkInBooking, checkOutBooking } = useHotel();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    email: "",
    roomType: "Standard Queen",
    checkIn: today,
    checkOut: tomorrow,
    source: "WALK_IN",
    specialRequests: "",
    totalAmount: 1200,
    companyName: "",
  });

  const assignableRooms = state.rooms.filter((room) =>
    ["AVAILABLE", "RESERVED"].includes(room.status),
  );

  return (
    <AppShell
      activeHref="/bookings"
      eyebrow="Bookings"
      title="Reservations, check-in, and checkout"
      description="Create bookings, assign rooms, and push stays through the front desk workflow."
    >
      <div className="grid gap-4 2xl:grid-cols-[1.1fr_1.4fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            New booking
          </h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={form.guestName}
              onChange={(event) =>
                setForm((current) => ({ ...current, guestName: event.target.value }))
              }
              placeholder="Guest name"
              className="suite-input"
            />
            <input
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Phone"
              className="suite-input"
            />
            <input
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Email"
              className="suite-input"
            />
            <input
              value={form.roomType}
              onChange={(event) =>
                setForm((current) => ({ ...current, roomType: event.target.value }))
              }
              placeholder="Room type"
              className="suite-input"
            />
            <input
              value={form.companyName}
              onChange={(event) =>
                setForm((current) => ({ ...current, companyName: event.target.value }))
              }
              placeholder="Company or group"
              className="suite-input"
            />
            <input
              type="date"
              value={form.checkIn}
              onChange={(event) =>
                setForm((current) => ({ ...current, checkIn: event.target.value }))
              }
              className="suite-input"
            />
            <input
              type="date"
              value={form.checkOut}
              onChange={(event) =>
                setForm((current) => ({ ...current, checkOut: event.target.value }))
              }
              className="suite-input"
            />
            <CustomSelect
              value={form.source}
              onChange={(value) => setForm((current) => ({ ...current, source: value }))}
              options={sources.map((source) => ({ value: source, label: source }))}
            />
            <input
              type="number"
              value={form.totalAmount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  totalAmount: Number(event.target.value),
                }))
              }
              placeholder="Total amount"
              className="suite-input"
            />
            <textarea
              value={form.specialRequests}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  specialRequests: event.target.value,
                }))
              }
              placeholder="Special requests"
              className="suite-input md:col-span-2 min-h-28"
            />
          </div>
          <button
            onClick={() => {
              createBooking(form);
              setForm({
                guestName: "",
                phone: "",
                email: "",
                roomType: "Standard Queen",
                checkIn: today,
                checkOut: tomorrow,
                source: "WALK_IN",
                specialRequests: "",
                totalAmount: 1200,
                companyName: "",
              });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Create booking
          </button>
          {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Active reservations
          </h3>
          <div className="mt-4 space-y-3">
            {state.bookings.map((booking) => (
              <div
                key={booking.id}
                className="suite-subcard px-4 py-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="font-medium">{booking.guestName}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {booking.code} • {booking.roomType} • {booking.source}
                    </p>
                    {booking.companyName ? (
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {booking.companyName}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-[var(--ink-soft)]">
                      {booking.checkIn} to {booking.checkOut}
                      {booking.roomNumber ? ` • Room ${booking.roomNumber}` : " • Unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={booking.status} />
                    <StatusBadge value={booking.paymentStatus} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {booking.status !== "CHECKED_IN" &&
                  booking.status !== "CHECKED_OUT" ? (
                    <div className="min-w-[240px]">
                      <CustomSelect
                        value=""
                        placeholder="Check in to room"
                        onChange={async (value) => {
                          const result = await checkInBooking(booking.id, value);
                          setMessage(result.message);
                        }}
                        options={assignableRooms
                          .filter(
                            (room) =>
                              room.roomType === booking.roomType || room.status === "AVAILABLE",
                          )
                          .map((room) => ({
                            value: room.roomNumber,
                            label: `${room.roomNumber} • ${room.status}`,
                          }))}
                      />
                    </div>
                  ) : null}
                  {booking.status === "CHECKED_IN" ? (
                    <button
                      onClick={() => checkOutBooking(booking.id)}
                      className="suite-button suite-button-primary"
                    >
                      Complete checkout
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
