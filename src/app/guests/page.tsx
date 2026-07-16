"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function GuestsPage() {
  const { state, updateGuestNotes } = useHotel();

  return (
    <AppShell
      activeHref="/guests"
      eyebrow="Guests"
      title="Guest profiles and stay history"
      description="Track guest preferences, VIP status, and service context for repeat stays."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        {state.guests.map((guest) => (
          <article key={guest.id} className="suite-card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                  {guest.firstName} {guest.lastName}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {guest.phone} • {guest.email}
                </p>
              </div>
              {guest.vipStatus ? <StatusBadge value="HIGH" /> : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="suite-subcard px-4 py-3 text-sm">
                Nationality: {guest.nationality || "Not set"}
              </div>
              <div className="suite-subcard px-4 py-3 text-sm">
                Stay count: {guest.stayCount}
              </div>
              <div className="suite-subcard px-4 py-3 text-sm">
                Preferences: {guest.preferences.join(", ") || "None"}
              </div>
              <div className="suite-subcard px-4 py-3 text-sm">
                Loyalty: {guest.loyaltyTier} • {guest.loyaltyPoints} pts
              </div>
              <div className="suite-subcard px-4 py-3 text-sm">
                Company: {guest.companyName || "Direct guest"}
              </div>
              <div className="suite-subcard px-4 py-3 text-sm">
                Profile flag: {guest.blacklisted ? "Restricted" : "Clear"}
              </div>
            </div>

            <textarea
              value={guest.notes}
              onChange={(event) => updateGuestNotes(guest.id, event.target.value)}
              className="suite-input mt-4 min-h-28 w-full"
            />
          </article>
        ))}
      </div>
    </AppShell>
  );
}
