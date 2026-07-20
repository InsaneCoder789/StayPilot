export type InvoicePaymentState = "UNPAID" | "PARTIAL" | "PAID";

export function toMinorUnits(value: number) {
  if (!Number.isFinite(value)) throw new Error("Amount must be finite.");
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromMinorUnits(value: number) {
  if (!Number.isSafeInteger(value)) throw new Error("Minor-unit amount must be a safe integer.");
  return value / 100;
}

export function calculateTax(subtotal: number, taxRate: number) {
  if (subtotal < 0 || taxRate < 0) throw new Error("Subtotal and tax rate cannot be negative.");
  return fromMinorUnits(Math.round(toMinorUnits(subtotal) * (taxRate / 100)));
}

export function invoicePaymentState(total: number, paid: number): InvoicePaymentState {
  const totalMinor = toMinorUnits(total);
  const paidMinor = toMinorUnits(paid);
  if (paidMinor <= 0) return "UNPAID";
  return paidMinor >= totalMinor ? "PAID" : "PARTIAL";
}

export function applyPayment(total: number, alreadyPaid: number, requested: number) {
  const totalMinor = toMinorUnits(total);
  const paidMinor = Math.max(0, toMinorUnits(alreadyPaid));
  const requestedMinor = toMinorUnits(requested);
  if (requestedMinor <= 0) throw new Error("Payment must be positive.");

  const capturedMinor = Math.min(requestedMinor, Math.max(totalMinor - paidMinor, 0));
  const nextPaidMinor = paidMinor + capturedMinor;
  return {
    captured: fromMinorUnits(capturedMinor),
    paid: fromMinorUnits(nextPaidMinor),
    balance: fromMinorUnits(Math.max(totalMinor - nextPaidMinor, 0)),
    status: invoicePaymentState(fromMinorUnits(totalMinor), fromMinorUnits(nextPaidMinor)),
  };
}

export function applyRefund(total: number, alreadyPaid: number, refundAmount: number) {
  const paidMinor = Math.max(0, toMinorUnits(alreadyPaid));
  const refundMinor = toMinorUnits(refundAmount);
  if (refundMinor <= 0 || refundMinor > paidMinor) throw new Error("Refund exceeds the captured amount.");

  const nextPaidMinor = paidMinor - refundMinor;
  return {
    paid: fromMinorUnits(nextPaidMinor),
    balance: fromMinorUnits(Math.max(toMinorUnits(total) - nextPaidMinor, 0)),
    status: invoicePaymentState(total, fromMinorUnits(nextPaidMinor)),
  };
}
