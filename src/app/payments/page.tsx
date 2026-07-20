"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { EmptyState } from "@/components/empty-state";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";
import { PaymentMethod } from "@/lib/hotel-data";

export default function PaymentsPage() {
  const {
    state,
    currentUser,
    recordPayment,
    createPaymentLink,
    refundPayment,
    createCreditNote,
    openCashierShift,
    recordCashMovement,
    closeCashierShift,
    reconcilePayments,
    togglePaymentGateway,
  } = useHotel();
  const openInvoices = state.invoices.filter((invoice) => invoice.balanceAmount > 0);
  const [invoiceId, setInvoiceId] = useState(openInvoices[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(
    openInvoices[0]?.balanceAmount.toString() ?? "",
  );
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [movementType, setMovementType] = useState<"CASH_IN" | "CASH_OUT" | "SAFE_DROP">("CASH_IN");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const effectiveInvoiceId = invoiceId || openInvoices[0]?.id || "";
  const selectedInvoice = state.invoices.find(
    (invoice) => invoice.id === effectiveInvoiceId,
  );
  const openShift = state.cashierShifts.find((shift) => shift.status === "OPEN" && shift.openedBy === currentUser?.id);

  const capturedTotal = state.payments
    .filter((payment) => payment.status === "CAPTURED")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <AppShell
      activeHref="/payments"
      eyebrow="Payments"
      title="Property payment terminal"
      description="Capture payments against hotel folios, issue receipts automatically, control accepted methods, and reverse transactions with a complete audit trail."
    >
      <section className="grid gap-6 2xl:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">New transaction</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em]">
              Take a payment
            </h2>

            {openInvoices.length === 0 ? (
              <div className="mt-7">
                <EmptyState
                  title="No balances waiting"
                  description="Issue an invoice first, or create a booking that generates a folio automatically."
                  actionLabel="Open invoice studio"
                  actionHref="/billing"
                />
              </div>
            ) : (
              <div className="mt-7 grid gap-4">
                <label>
                  <span className="suite-label">Invoice</span>
                  <CustomSelect
                    value={effectiveInvoiceId}
                    onChange={(value) => {
                      setInvoiceId(value);
                      const nextInvoice = state.invoices.find(
                        (invoice) => invoice.id === value,
                      );
                      setAmount(nextInvoice?.balanceAmount.toString() ?? "");
                    }}
                    options={openInvoices.map((invoice) => ({
                      value: invoice.id,
                      label: `${invoice.invoiceNumber ?? invoice.bookingCode} • ${invoice.guestName} • AED ${invoice.balanceAmount.toFixed(2)}`,
                    }))}
                  />
                </label>

                {selectedInvoice ? (
                  <div className="suite-subcard grid grid-cols-2 gap-4 p-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Guest</p>
                      <p className="mt-2 text-sm">{selectedInvoice.guestName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">Balance</p>
                      <p className="mt-2 font-mono text-lg text-[var(--accent)] tabular-nums">
                        AED {selectedInvoice.balanceAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <label>
                  <span className="suite-label">Payment method</span>
                  <CustomSelect
                    value={method}
                    onChange={(value) => setMethod(value as PaymentMethod)}
                    options={state.paymentGateways.map((gateway) => ({
                      value: gateway.method,
                      label: `${gateway.method.replaceAll("_", " ")} • ${gateway.status}`,
                    }))}
                  />
                </label>
                <label>
                  <span className="suite-label">Amount</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="suite-input font-mono tabular-nums"
                    placeholder="0.00"
                  />
                </label>
                <label>
                  <span className="suite-label">Gateway reference</span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    className="suite-input"
                    placeholder="Optional terminal or bank reference"
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    const result = await recordPayment(
                      effectiveInvoiceId,
                      Number(amount),
                      method,
                      reference,
                    );
                    setMessage(result.message);
                    if (result.ok) {
                      setReference("");
                      setAmount("");
                    }
                  }}
                  className="suite-button suite-button-primary"
                >
                  Capture and issue receipt
                </button>
                <button
                  type="button"
                  onClick={async () => setMessage((await createPaymentLink(effectiveInvoiceId, Number(amount))).message)}
                  className="suite-button suite-button-secondary"
                >
                  Open secure Stripe checkout
                </button>
                {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              ["Captured", `AED ${capturedTotal.toFixed(2)}`, `${state.payments.length} transactions`],
              ["Open balance", `AED ${state.invoices.reduce((sum, item) => sum + item.balanceAmount, 0).toFixed(2)}`, `${openInvoices.length} invoices`],
              ["Receipts", `${state.receipts.length}`, "Available for print"],
            ].map(([label, value, helper]) => (
              <div key={label} className="suite-bezel">
                <div className="suite-core">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted-dim)]">{label}</p>
                  <p className="mt-4 font-mono text-2xl font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="suite-bezel">
            <div className="suite-core">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <span className="suite-eyebrow">Gateway control</span>
                  <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                    Accepted payment rails
                  </h2>
                </div>
                <p className="text-xs text-[var(--muted)]">Managed in-house</p>
              </div>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {state.paymentGateways.map((gateway) => (
                  <article key={gateway.id} className="suite-subcard p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{gateway.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {gateway.settlementWindow}
                        </p>
                      </div>
                      <StatusBadge value={gateway.status} />
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePaymentGateway(gateway.id)}
                      className="suite-button suite-button-secondary mt-4"
                    >
                      {gateway.enabled ? "Take offline" : "Bring online"}
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Cash drawer</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Cashier shift</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{openShift ? `Open since ${openShift.openedAt}` : "No drawer is assigned to you."}</p>
            <div className="mt-5 grid gap-3">
              <input type="number" value={cashAmount} onChange={(event) => setCashAmount(event.target.value)} className="suite-input font-mono" placeholder={openShift ? "Movement or closing amount" : "Opening float"} />
              {openShift ? (
                <CustomSelect value={movementType} onChange={(value) => setMovementType(value as typeof movementType)} options={["CASH_IN", "CASH_OUT", "SAFE_DROP"].map((value) => ({ value, label: value.replaceAll("_", " ") }))} />
              ) : null}
              <input value={cashNote} onChange={(event) => setCashNote(event.target.value)} className="suite-input" placeholder="Count note or reason" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="suite-button suite-button-primary" onClick={async () => {
                  const result = openShift ? await recordCashMovement(openShift.id, movementType, Number(cashAmount), cashNote) : await openCashierShift(Number(cashAmount), cashNote);
                  setMessage(result.message);
                  if (result.ok) { setCashAmount(""); setCashNote(""); }
                }}>{openShift ? "Record movement" : "Open shift"}</button>
                {openShift ? <button type="button" className="suite-button suite-button-secondary" onClick={async () => {
                  const result = await closeCashierShift(openShift.id, Number(cashAmount), cashNote);
                  setMessage(result.message);
                  if (result.ok) { setCashAmount(""); setCashNote(""); }
                }}>Close and count</button> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Adjustments</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Issue credit note</h2>
            <div className="mt-5 grid gap-3">
              <CustomSelect value={effectiveInvoiceId} onChange={setInvoiceId} options={openInvoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoiceNumber} · ${invoice.guestName}` }))} />
              <input type="number" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} className="suite-input font-mono" placeholder="Credit amount" />
              <input value={creditReason} onChange={(event) => setCreditReason(event.target.value)} className="suite-input" placeholder="Mandatory adjustment reason" />
              <button type="button" className="suite-button suite-button-primary" onClick={async () => {
                const result = await createCreditNote(effectiveInvoiceId, Number(creditAmount), creditReason);
                setMessage(result.message);
                if (result.ok) { setCreditAmount(""); setCreditReason(""); }
              }}>Issue controlled credit</button>
            </div>
          </div>
        </div>

        <div className="suite-bezel">
          <div className="suite-core">
            <span className="suite-eyebrow">Settlement</span>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Reconcile today</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Compare the recorded ledger with the provider or bank settlement.</p>
            <div className="mt-5 grid gap-3">
              <input type="number" value={settlementAmount} onChange={(event) => setSettlementAmount(event.target.value)} className="suite-input font-mono" placeholder="Actual settled amount" />
              <button type="button" className="suite-button suite-button-primary" onClick={async () => {
                const end = new Date();
                const start = new Date(end); start.setHours(0, 0, 0, 0);
                const result = await reconcilePayments({ method, provider: method === "CARD" ? "STRIPE" : "MANUAL", periodStart: start.toISOString(), periodEnd: end.toISOString(), actualAmount: Number(settlementAmount) });
                setMessage(result.message);
                if (result.ok) setSettlementAmount("");
              }}>Run reconciliation</button>
              {state.reconciliations[0] ? <p className="text-xs text-[var(--muted)]">Latest: {state.reconciliations[0].status} · variance AED {state.reconciliations[0].variance.toFixed(2)}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 suite-bezel">
        <div className="suite-core">
          <span className="suite-eyebrow">Ledger</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
            Transaction history
          </h2>
          {state.payments.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No transactions yet"
                description="Captured payments and refunds will appear here with operator, reference, invoice, and receipt details."
              />
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {state.payments.map((payment) => (
                <article
                  key={payment.id}
                  className="suite-subcard grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(7rem,.4fr))_auto] xl:items-center"
                >
                  <div>
                    <p className="font-medium">{payment.guestName}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {payment.receiptNumber} • {payment.reference}
                    </p>
                  </div>
                  <p className="font-mono text-sm tabular-nums">AED {payment.amount.toFixed(2)}</p>
                  <p className="text-sm text-[var(--muted)]">{payment.method.replaceAll("_", " ")}</p>
                  <StatusBadge value={payment.status} />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={refundAmounts[payment.id] ?? (payment.amount - payment.amountRefunded).toFixed(2)}
                      onChange={(event) => setRefundAmounts((values) => ({ ...values, [payment.id]: event.target.value }))}
                      disabled={payment.status === "REFUNDED"}
                      className="suite-input min-w-24 font-mono"
                      aria-label={`Refund amount for ${payment.receiptNumber}`}
                    />
                    <button
                      type="button"
                      onClick={async () => setMessage((await refundPayment(payment.id, Number(refundAmounts[payment.id] ?? payment.amount - payment.amountRefunded))).message)}
                      disabled={payment.status === "REFUNDED"}
                      className="suite-button suite-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Refund
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
