"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { NfcAccessEventRecord } from "@/lib/hotel-data";

export default function AccessTrackerPage() {
  const { state, recordNfcEvent } = useHotel();
  const [cardId, setCardId] = useState(state.roomCards[0]?.id ?? "");
  const [event, setEvent] =
    useState<NfcAccessEventRecord["event"]>("ACCESS_GRANTED");
  const [location, setLocation] = useState("Guest room door");
  const activeCards = state.roomCards.filter((card) => card.status === "ACTIVE");
  const deniedCount = state.nfcEvents.filter(
    (item) => item.event === "ACCESS_DENIED",
  ).length;

  return (
    <AppShell
      activeHref="/access-tracker"
      eyebrow="Access control"
      title="NFC event tracker"
      description="Track credential encoding, granted and denied access, room-door activity, and card expiry from the property access ledger."
    >
      <section className="grid gap-6 2xl:grid-cols-[minmax(18rem,.35fr)_minmax(0,.65fr)]">
        <aside className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Event console</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              Record access event
            </h2>
            {state.roomCards.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="No credentials issued"
                  description="Issue a room key before recording access activity."
                  actionLabel="Open key control"
                  actionHref="/room-cards"
                />
              </div>
            ) : (
              <div className="mt-6 grid gap-4">
                <label>
                  <span className="suite-label">Credential</span>
                  <CustomSelect
                    value={cardId}
                    onChange={setCardId}
                    options={state.roomCards.map((card) => ({
                      value: card.id,
                      label: `Room ${card.roomNumber} • ${card.guestName || "Unassigned"} • ${card.status}`,
                    }))}
                  />
                </label>
                <label>
                  <span className="suite-label">Event</span>
                  <CustomSelect
                    value={event}
                    onChange={(value) =>
                      setEvent(value as NfcAccessEventRecord["event"])
                    }
                    options={["ACCESS_GRANTED", "ACCESS_DENIED", "ENCODED", "EXPIRED"].map(
                      (item) => ({
                        value: item,
                        label: item.replaceAll("_", " "),
                      }),
                    )}
                  />
                </label>
                <label>
                  <span className="suite-label">Reader location</span>
                  <input
                    value={location}
                    onChange={(inputEvent) => setLocation(inputEvent.target.value)}
                    className="suite-input"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => cardId && recordNfcEvent(cardId, event, location)}
                  className="suite-button suite-button-primary"
                >
                  Write event to ledger
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ["Active keys", activeCards.length, "Live credentials"],
              ["Access events", state.nfcEvents.length, "Ledger entries"],
              ["Denied", deniedCount, "Needs review"],
            ].map(([label, value, helper]) => (
              <div key={label} className="suite-bezel">
                <div className="suite-core">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">
                    {label}
                  </p>
                  <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="suite-bezel">
            <div className="suite-core">
              <span className="suite-eyebrow">Live ledger</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                Recent access activity
              </h2>
              {state.nfcEvents.length === 0 ? (
                <div className="mt-6">
                  <EmptyState
                    title="No access events"
                    description="Credential encoding and door-reader activity will appear here."
                  />
                </div>
              ) : (
                <div className="mt-6 grid gap-3">
                  {state.nfcEvents.map((item) => (
                    <article
                      key={item.id}
                      className="suite-subcard grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <p className="font-medium">
                          Room {item.roomNumber} • {item.guestName || "Unassigned"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {item.location} • {item.occurredAt}
                        </p>
                      </div>
                      <StatusBadge value={item.event} />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </AppShell>
  );
}
