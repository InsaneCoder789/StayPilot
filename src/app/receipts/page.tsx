"use client";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { exportReceiptPdf } from "@/lib/pdf";

export default function ReceiptsPage() {
  const { state } = useHotel();

  return (
    <AppShell
      activeHref="/receipts"
      eyebrow="Receipt gateway"
      title="Receipts, proof and settlement"
      description="Every captured payment creates a numbered receipt tied to its invoice, method, operator reference, and downloadable PDF."
    >
      <section className="suite-bezel">
        <div className="suite-core">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="suite-subcard p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Receipts issued</p>
              <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">{state.receipts.length}</p>
            </div>
            <div className="suite-subcard p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Captured value</p>
              <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
                AED {state.payments.filter((item) => item.status === "CAPTURED").reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </p>
            </div>
            <div className="suite-subcard p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Refunded value</p>
              <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
                AED {state.payments.filter((item) => item.status === "REFUNDED").reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
              </p>
            </div>
          </div>

          {state.receipts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No receipts issued"
                description="Capture a payment and the receipt gateway will create a numbered proof of payment automatically."
                actionLabel="Open payment terminal"
                actionHref="/payments"
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {state.receipts.map((receipt) => {
                const payment = state.payments.find((item) => item.id === receipt.paymentId);
                return (
                  <article key={receipt.id} className="suite-bezel">
                    <div className="suite-core">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Receipt</p>
                          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">{receipt.receiptNumber}</h2>
                        </div>
                        <StatusBadge value={payment?.status ?? "CAPTURED"} />
                      </div>
                      <div className="mt-6 grid gap-3 text-sm">
                        <div className="suite-subcard p-3">
                          <p className="text-xs text-[var(--muted)]">Guest</p>
                          <p className="mt-1">{receipt.guestName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="suite-subcard p-3">
                            <p className="text-xs text-[var(--muted)]">Method</p>
                            <p className="mt-1">{receipt.method.replaceAll("_", " ")}</p>
                          </div>
                          <div className="suite-subcard p-3">
                            <p className="text-xs text-[var(--muted)]">Invoice</p>
                            <p className="mt-1 truncate">{receipt.invoiceNumber}</p>
                          </div>
                        </div>
                      </div>
                      <p className="mt-6 font-mono text-3xl font-semibold tracking-[-0.05em] text-[var(--accent)] tabular-nums">
                        AED {receipt.amount.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => exportReceiptPdf(state.hotel, receipt, payment)}
                        className="suite-button suite-button-primary mt-6 w-full"
                      >
                        Download receipt PDF
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
