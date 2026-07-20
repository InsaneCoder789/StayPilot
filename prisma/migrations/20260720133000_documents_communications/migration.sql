CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED');

ALTER TABLE "Document" ADD COLUMN "content" BYTEA,
ADD COLUMN "uploadedBy" TEXT;

CREATE TABLE "DocumentTemplate" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "DocumentType" NOT NULL,
  "subject" TEXT,
  "content" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Communication" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
  "provider" TEXT,
  "providerMessageId" TEXT,
  "linkedRef" TEXT,
  "error" TEXT,
  "createdBy" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentTemplate_hotelId_type_active_idx" ON "DocumentTemplate"("hotelId", "type", "active");
CREATE UNIQUE INDEX "DocumentTemplate_hotelId_name_key" ON "DocumentTemplate"("hotelId", "name");
CREATE INDEX "Communication_hotelId_status_createdAt_idx" ON "Communication"("hotelId", "status", "createdAt");
CREATE INDEX "Communication_hotelId_recipient_createdAt_idx" ON "Communication"("hotelId", "recipient", "createdAt");

ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
