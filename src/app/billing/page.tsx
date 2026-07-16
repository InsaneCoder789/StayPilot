"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { SuiteIcon } from "@/components/suite-icon";
import { exportInvoicePdf } from "@/lib/pdf";

type DraftLine = { id: string; label: string; amount: string };

export default function BillingPage() {
  const { state, createInvoice } = useHotel();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    guestName: "",
    guestEmail: "",
    bookingCode: "",
    roomNumber: "",
    dueDate: "",
    notes: "",
  });
  const [lines, setLines] = useState<DraftLine[]>([
    { id: "line-1", label: "Room charge", amount: "" },
    { id: "line-2", label: "Tax", amount: "" },
  ]);

  const draftTotal = lines.reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0,
  );

  function resetDraft() {
    setForm({
      guestName: "",
      guestEmail: "",
      bookingCode: "",
      roomNumber: "",
      dueDate: "",
      notes: "",
    });
    setLines([
      { id: "line-1", label: "Room charge", amount: "" },
      { id: "line-2", label: "Tax", amount: "" },
    ]);
  }

  return (
    <AppShell
      activeHref="/billing"
      eyebrow="Revenue desk"
      title="Invoice studio"
      description="Build property invoices, attach folio charges, issue tax-ready PDFs, and hand the balance directly to the payment terminal."
    >
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.12fr)_minmax(22rem,.88fr)]">
        <div className="suite-bezel">
          <div className="suite-core">
            <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="suite-eyebrow">New document</span>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
                  Create a guest invoice
                </h2>
              </div>
              <p className="text-right font-mono text-2xl text-[var(--accent)] tabular-nums">
                AED {draftTotal.toFixed(2)}
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <label>
                <span className="suite-label">Guest name</span>
                <input
                  value={form.guestName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guestName: event.target.value }))
                  }
                  placeholder="Full guest name"
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Guest email</span>
                <input
                  type="email"
                  value={form.guestEmail}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guestEmail: event.target.value }))
                  }
                  placeholder="guest@email.com"
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Booking reference</span>
                <input
                  value={form.bookingCode}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bookingCode: event.target.value }))
                  }
                  placeholder="Optional booking code"
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Room</span>
                <input
                  value={form.roomNumber}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roomNumber: event.target.value }))
                  }
                  placeholder="Room number"
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, dueDate: event.target.value }))
                  }
                  className="suite-input"
                />
              </label>
              <label>
                <span className="suite-label">Internal note</span>
                <input
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Payment terms or folio note"
                  className="suite-input"
                />
              </label>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-medium">Line items</h3>
                <button
                  type="button"
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      {
                        id: `line-${Date.now()}`,
                        label: "",
                        amount: "",
                      },
                    ])
                  }
                  className="suite-text-link"
                >
                  Add line
                  <SuiteIcon name="arrow" className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-3">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    className="suite-subcard grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
                  >
                    <input
                      value={line.label}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.id === line.id
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder={`Charge ${index + 1}`}
                      className="suite-input"
                    />
                    <input
                      type="number"
                      value={line.amount}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.id === line.id
                              ? { ...item, amount: event.target.value }
                              : item,
                          ),
                        )
                      }
                      placeholder="0.00"
                      className="suite-input tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.length > 1
                            ? current.filter((item) => item.id !== line.id)
                            : current,
                        )
                      }
                      className="suite-icon-button"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  const result = await createInvoice({
                    ...form,
                    lineItems: lines.map((line) => ({
                      label: line.label,
                      amount: Number(line.amount) || 0,
                    })),
                  });
                  setMessage(result.message);
                  if (result.ok) resetDraft();
                }}
                className="suite-button suite-button-primary group"
              >
                Issue invoice
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
                  <SuiteIcon name="arrow" className="h-3.5 w-3.5" />
                </span>
              </button>
              <button type="button" onClick={resetDraft} className="suite-button suite-button-secondary">
                Clear draft
              </button>
              {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
            </div>
          </div>
        </div>

        <aside className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Preview</span>
            <div className="mt-5 rounded-[1.3rem] bg-[#f4f0e7] p-6 text-[#25231f] shadow-[0_28px_80px_rgba(4,4,3,.24)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8d7445]">
                {state.hotel.hotelName}
              </p>
              <h3 className="mt-4 text-2xl font-semibold tracking-[-0.05em]">Tax invoice</h3>
              <div className="mt-8 grid gap-2 text-xs text-[#6d675c]">
                <p>Bill to: {form.guestName || "Guest name"}</p>
                <p>Booking: {form.bookingCode || "Direct folio"}</p>
                <p>Room: {form.roomNumber || "Not assigned"}</p>
              </div>
              <div className="mt-7 border-y border-[#d7d0c0] py-3">
                {lines.map((line) => (
                  <div key={line.id} className="flex justify-between gap-4 py-2 text-xs">
                    <span>{line.label || "Charge description"}</span>
                    <span className="font-mono tabular-nums">
                      AED {(Number(line.amount) || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-end justify-between">
                <span className="text-xs text-[#6d675c]">Balance due</span>
                <span className="font-mono text-2xl font-semibold tabular-nums">
                  {draftTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 suite-bezel">
        <div className="suite-core">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="suite-eyebrow">Document register</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Issued invoices</h2>
            </div>
            <p className="text-sm text-[var(--muted)]">
              {state.invoices.length} documents on file
            </p>
          </div>
          {state.invoices.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No invoices issued"
                description="Create the first invoice above. It will appear here and become immediately available at the payment terminal."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {state.invoices.map((invoice) => (
                <article
                  key={invoice.id}
                  className="suite-subcard grid gap-4 p-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(7rem,.45fr))_auto] xl:items-center"
                >
                  <div>
                    <p className="font-medium">{invoice.guestName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {invoice.invoiceNumber ?? invoice.bookingCode} • {invoice.bookingCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-dim)]">Total</p>
                    <p className="mt-1 font-mono text-sm tabular-nums">AED {invoice.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted-dim)]">Balance</p>
                    <p className="mt-1 font-mono text-sm tabular-nums">AED {invoice.balanceAmount.toFixed(2)}</p>
                  </div>
                  <StatusBadge value={invoice.status} />
                  <button
                    type="button"
                    onClick={() => exportInvoicePdf(state.hotel, invoice)}
                    className="suite-button suite-button-secondary"
                  >
                    Export PDF
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
