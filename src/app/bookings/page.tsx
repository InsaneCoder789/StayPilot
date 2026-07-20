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
  const { state, createBooking, assignBookingRoom, updateBookingDates, cancelBooking, markBookingNoShow, checkInBooking, checkOutBooking, extendStay, moveRoom } = useHotel();
  const [message, setMessage] = useState("");
  const [bookingDrafts, setBookingDrafts] = useState<Record<string, { checkIn: string; checkOut: string; reason: string }>>({});
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
    depositRequired: 0,
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
            <input
              type="number"
              min="0"
              value={form.depositRequired}
              onChange={(event) => setForm((current) => ({ ...current, depositRequired: Number(event.target.value) }))}
              placeholder="Required deposit"
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
            onClick={async () => {
              const result = await createBooking(form);
              setMessage(result.message);
              if (!result.ok) return;
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
                depositRequired: 0,
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

                {["PENDING", "CONFIRMED"].includes(booking.status) ? (
                  <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4">
                    <div className="grid gap-3 lg:grid-cols-[minmax(14rem,.8fr)_1fr_auto]">
                      <CustomSelect value={booking.roomNumber ?? ""} placeholder="Reserve matching room" onChange={async (value) => setMessage((await assignBookingRoom(booking.id, value)).message)} options={assignableRooms.filter((room) => room.roomType === booking.roomType).map((room) => ({ value: room.roomNumber, label: `${room.roomNumber} • ${room.status}` }))} />
                      <div className="grid grid-cols-2 gap-2"><input type="date" className="suite-input" value={bookingDrafts[booking.id]?.checkIn ?? booking.checkIn} onChange={(event) => setBookingDrafts((current) => ({ ...current, [booking.id]: { checkIn: event.target.value, checkOut: current[booking.id]?.checkOut ?? booking.checkOut, reason: current[booking.id]?.reason ?? "" } }))} /><input type="date" className="suite-input" value={bookingDrafts[booking.id]?.checkOut ?? booking.checkOut} onChange={(event) => setBookingDrafts((current) => ({ ...current, [booking.id]: { checkIn: current[booking.id]?.checkIn ?? booking.checkIn, checkOut: event.target.value, reason: current[booking.id]?.reason ?? "" } }))} /></div>
                      <button className="suite-button" onClick={async () => { const draft = bookingDrafts[booking.id] ?? booking; setMessage((await updateBookingDates(booking.id, draft.checkIn, draft.checkOut)).message); }}>Update dates</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.roomNumber ? <button className="suite-button suite-button-primary" onClick={async () => setMessage((await checkInBooking(booking.id, booking.roomNumber!)).message)}>Check in room {booking.roomNumber}</button> : null}
                      <input className="suite-input min-w-[16rem] flex-1" value={bookingDrafts[booking.id]?.reason ?? ""} onChange={(event) => setBookingDrafts((current) => ({ ...current, [booking.id]: { checkIn: current[booking.id]?.checkIn ?? booking.checkIn, checkOut: current[booking.id]?.checkOut ?? booking.checkOut, reason: event.target.value } }))} placeholder="Cancellation reason" />
                      <button className="suite-button" onClick={async () => setMessage((await cancelBooking(booking.id, bookingDrafts[booking.id]?.reason ?? "")).message)}>Cancel</button>
                      <button className="suite-button" onClick={async () => setMessage((await markBookingNoShow(booking.id)).message)}>No-show</button>
                    </div>
                  </div>
                ) : null}
                {booking.status === "CHECKED_IN" ? (
                  <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 lg:grid-cols-[1fr_1fr_auto]">
                    <CustomSelect value="" placeholder="Move to matching room" onChange={async (value) => setMessage((await moveRoom(booking.id, value)).message)} options={state.rooms.filter((room) => room.status === "AVAILABLE" && room.roomType === booking.roomType).map((room) => ({ value: room.roomNumber, label: `Room ${room.roomNumber}` }))} />
                    <div className="flex gap-2"><input type="date" className="suite-input" value={bookingDrafts[booking.id]?.checkOut ?? booking.checkOut} onChange={(event) => setBookingDrafts((current) => ({ ...current, [booking.id]: { checkIn: booking.checkIn, checkOut: event.target.value, reason: "" } }))} /><button className="suite-button" onClick={async () => setMessage((await extendStay(booking.id, bookingDrafts[booking.id]?.checkOut ?? booking.checkOut)).message)}>Extend</button></div>
                    <button onClick={async () => setMessage((await checkOutBooking(booking.id)).message)} className="suite-button suite-button-primary">Complete checkout</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
