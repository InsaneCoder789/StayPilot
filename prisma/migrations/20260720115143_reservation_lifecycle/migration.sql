-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "depositRequired" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "noShowAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_hotelId_roomId_checkInAt_checkOutAt_idx" ON "Booking"("hotelId", "roomId", "checkInAt", "checkOutAt");
