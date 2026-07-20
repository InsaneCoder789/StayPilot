CREATE TYPE "NfcDeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED');
CREATE TYPE "NfcCommandStatus" AS ENUM ('QUEUED', 'CLAIMED', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE "IntegrationSyncDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "IntegrationSyncStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'IGNORED');

CREATE TABLE "NfcDevice" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "deviceCode" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'STAYPILOT_BRIDGE',
  "status" "NfcDeviceStatus" NOT NULL DEFAULT 'OFFLINE',
  "secretHash" TEXT NOT NULL,
  "firmware" TEXT,
  "lastHeartbeat" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NfcDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NfcCommand" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "roomCardId" TEXT,
  "command" TEXT NOT NULL,
  "status" "NfcCommandStatus" NOT NULL DEFAULT 'QUEUED',
  "payloadCiphertext" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "claimedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NfcCommand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationSyncLog" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "direction" "IntegrationSyncDirection" NOT NULL,
  "externalId" TEXT NOT NULL,
  "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "result" JSONB,
  "error" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NfcDevice_secretHash_key" ON "NfcDevice"("secretHash");
CREATE INDEX "NfcDevice_hotelId_status_lastHeartbeat_idx" ON "NfcDevice"("hotelId", "status", "lastHeartbeat");
CREATE UNIQUE INDEX "NfcDevice_hotelId_deviceCode_key" ON "NfcDevice"("hotelId", "deviceCode");
CREATE INDEX "NfcCommand_deviceId_status_createdAt_idx" ON "NfcCommand"("deviceId", "status", "createdAt");
CREATE INDEX "NfcCommand_hotelId_status_createdAt_idx" ON "NfcCommand"("hotelId", "status", "createdAt");
CREATE INDEX "IntegrationSyncLog_hotelId_status_createdAt_idx" ON "IntegrationSyncLog"("hotelId", "status", "createdAt");
CREATE INDEX "IntegrationSyncLog_hotelId_provider_createdAt_idx" ON "IntegrationSyncLog"("hotelId", "provider", "createdAt");
CREATE UNIQUE INDEX "IntegrationSyncLog_provider_operation_externalId_key" ON "IntegrationSyncLog"("provider", "operation", "externalId");

ALTER TABLE "NfcDevice" ADD CONSTRAINT "NfcDevice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcCommand" ADD CONSTRAINT "NfcCommand_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcCommand" ADD CONSTRAINT "NfcCommand_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "NfcDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NfcCommand" ADD CONSTRAINT "NfcCommand_roomCardId_fkey" FOREIGN KEY ("roomCardId") REFERENCES "RoomCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IntegrationSyncLog" ADD CONSTRAINT "IntegrationSyncLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
