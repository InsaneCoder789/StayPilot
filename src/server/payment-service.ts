import "server-only";

import type { PaymentMethod, Prisma } from "@/generated/prisma/client";

import { applyPayment } from "@/domain/finance";
import { getDb } from "@/lib/db";
import { nextDocumentCode } from "@/server/document-sequence";

type CaptureInput = {
  hotelId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  processedBy: string;
  actorId?: string;
  provider?: string;
  providerPaymentId?: string;
  idempotencyKey?: string;
  paymentRequestId?: string;
  cashierShiftId?: string;
};

export async function captureInvoicePayment(input: CaptureInput) {
  const db = getDb();
  return db.$transaction(async (tx) => {
    if (input.idempotencyKey) {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) return existing;
    }

    const invoice = await tx.invoice.findFirst({
      where: { id: input.invoiceId, hotelId: input.hotelId },
    });
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (input.amount <= 0 || Number(invoice.balanceAmount) <= 0) throw new Error("INVOICE_BALANCE_CLOSED");

    const state = applyPayment(Number(invoice.totalAmount), Number(invoice.paidAmount), input.amount);
    if (Math.abs(state.captured - input.amount) > 0.001) throw new Error("PAYMENT_EXCEEDS_BALANCE");

    const receiptNumber = await nextDocumentCode(tx, input.hotelId, "RECEIPT", "RCT");
    const payment = await tx.payment.create({
      data: {
        hotelId: input.hotelId,
        invoiceId: invoice.id,
        receiptNumber,
        guestName: invoice.guestName,
        amount: state.captured,
        method: input.method,
        reference: input.reference,
        processedBy: input.processedBy,
        provider: input.provider ?? "MANUAL",
        providerPaymentId: input.providerPaymentId,
        idempotencyKey: input.idempotencyKey,
        cashierShiftId: input.cashierShiftId,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { paidAmount: state.paid, balanceAmount: state.balance, status: state.status },
    });
    if (invoice.bookingId) {
      await tx.booking.update({
        where: { id: invoice.bookingId },
        data: { advancePaid: state.paid, paymentStatus: state.status },
      });
    }
    await tx.receipt.create({
      data: {
        hotelId: input.hotelId,
        paymentId: payment.id,
        invoiceId: invoice.id,
        receiptNumber,
        invoiceNumber: invoice.invoiceNumber,
        guestName: invoice.guestName,
        amount: state.captured,
        method: input.method,
      },
    });
    await tx.document.create({
      data: { hotelId: input.hotelId, title: `Receipt ${receiptNumber}`, type: "RECEIPT", linkedRef: invoice.invoiceNumber },
    });
    if (input.paymentRequestId) {
      await tx.paymentRequest.update({
        where: { id: input.paymentRequestId },
        data: { paymentId: payment.id, status: "COMPLETED", completedAt: new Date() },
      });
    }
    await tx.auditLog.create({
      data: {
        hotelId: input.hotelId,
        userId: input.actorId,
        actorName: input.processedBy,
        action: "CAPTURE_PAYMENT",
        entityType: "Payment",
        entityId: payment.id,
        target: `${receiptNumber} · ${invoice.currency} ${state.captured.toFixed(2)}`,
        newValue: { provider: input.provider ?? "MANUAL", reference: input.reference } satisfies Prisma.InputJsonValue,
      },
    });
    return payment;
  }, { isolationLevel: "Serializable" });
}
