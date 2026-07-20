ALTER TABLE "Payment" ADD COLUMN "cashierShiftId" TEXT;
CREATE INDEX "Payment_cashierShiftId_idx" ON "Payment"("cashierShiftId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashierShiftId_fkey" FOREIGN KEY ("cashierShiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
