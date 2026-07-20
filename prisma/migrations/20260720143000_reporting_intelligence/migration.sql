CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "ReportRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "ReportSchedule" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "reportType" TEXT NOT NULL,
  "frequency" "ReportFrequency" NOT NULL,
  "recipients" JSONB NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "lastRunAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportRun" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "scheduleId" TEXT,
  "reportType" TEXT NOT NULL,
  "status" "ReportRunStatus" NOT NULL DEFAULT 'PENDING',
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "payload" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportSchedule_active_nextRunAt_idx" ON "ReportSchedule"("active", "nextRunAt");
CREATE INDEX "ReportSchedule_hotelId_active_nextRunAt_idx" ON "ReportSchedule"("hotelId", "active", "nextRunAt");
CREATE INDEX "ReportRun_hotelId_startedAt_idx" ON "ReportRun"("hotelId", "startedAt");
CREATE INDEX "ReportRun_scheduleId_startedAt_idx" ON "ReportRun"("scheduleId", "startedAt");

ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReportSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
