-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('HOTEL_ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'OCCUPIED', 'DIRTY', 'CLEANING', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."PaymentState" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'OTA_VCC');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('CAPTURED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."WorkStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."ComplaintStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."AccessType" AS ENUM ('NFC', 'MAGSTRIPE', 'RFID');

-- CreateEnum
CREATE TYPE "public"."CardStatus" AS ENUM ('READY', 'ENCODED', 'ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."AccessEventType" AS ENUM ('ENCODED', 'ACCESS_GRANTED', 'ACCESS_DENIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."BlueprintZoneType" AS ENUM ('ROOM', 'LOBBY', 'SERVICE', 'STAIR', 'LIFT', 'AMENITY');

-- CreateEnum
CREATE TYPE "public"."GatewayStatus" AS ENUM ('READY', 'OFFLINE');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('INVOICE', 'POLICY', 'GUEST_FORM', 'ROOM_CARD_LOG', 'AUDIT', 'HANDOVER', 'RECEIPT', 'BLUEPRINT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InventoryCategory" AS ENUM ('LINEN', 'AMENITY', 'MINIBAR', 'HOUSEKEEPING', 'ENGINEERING');

-- CreateEnum
CREATE TYPE "public"."VendorCategory" AS ENUM ('HVAC', 'PLUMBING', 'LINEN', 'IT', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "public"."Department" AS ENUM ('FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."NightAuditStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."IntegrationType" AS ENUM ('OTA', 'PAYMENT', 'EMAIL', 'WHATSAPP', 'NFC_LOCK', 'ACCOUNTING');

-- CreateEnum
CREATE TYPE "public"."IntegrationStatus" AS ENUM ('DISCONNECTED', 'READY', 'CONNECTED');

-- CreateEnum
CREATE TYPE "public"."RagDocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "propertyCode" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "taxRegistrationNo" TEXT,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "checkInTime" TEXT NOT NULL,
    "checkOutTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "themeMode" TEXT NOT NULL DEFAULT 'dark',
    "themeAccent" TEXT NOT NULL DEFAULT '#8eb69b',
    "themeSurface" TEXT NOT NULL DEFAULT '#13191d',
    "themeSurfaceStrong" TEXT NOT NULL DEFAULT '#1a2329',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "employeeCode" TEXT,
    "department" TEXT,
    "shiftLabel" TEXT,
    "workload" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bedType" TEXT NOT NULL,
    "amenities" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "capacity" INTEGER NOT NULL,
    "guestName" TEXT,
    "nextBookingAt" TIMESTAMP(3),
    "housekeepingNote" TEXT,
    "notes" TEXT,
    "outOfService" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomStatusLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "oldStatus" "public"."RoomStatus" NOT NULL,
    "newStatus" "public"."RoomStatus" NOT NULL,
    "userId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Guest" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "address" TEXT,
    "vipStatus" BOOLEAN NOT NULL DEFAULT false,
    "preferences" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "stayCount" INTEGER NOT NULL DEFAULT 0,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "loyaltyTier" TEXT NOT NULL DEFAULT 'BRONZE',
    "companyName" TEXT,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GroupReservation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "companyName" TEXT,
    "roomCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "groupReservationId" TEXT,
    "roomId" TEXT,
    "guestName" TEXT NOT NULL,
    "roomTypeName" TEXT NOT NULL,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3) NOT NULL,
    "paymentStatus" "public"."PaymentState" NOT NULL DEFAULT 'UNPAID',
    "advancePaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "specialRequests" TEXT NOT NULL DEFAULT '',
    "companyName" TEXT,
    "actualCheckInAt" TIMESTAMP(3),
    "actualCheckOutAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HousekeepingTask" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "public"."WorkStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."Priority" NOT NULL,
    "taskType" TEXT NOT NULL DEFAULT 'CHECKOUT_CLEANING',
    "checkoutAt" TIMESTAMP(3),
    "nextCheckInAt" TIMESTAMP(3),
    "assignee" TEXT NOT NULL DEFAULT 'Unassigned',
    "checklistComplete" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vendor" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."VendorCategory" NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT,
    "sla" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceTicket" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT,
    "vendorId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "public"."Priority" NOT NULL,
    "status" "public"."MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "assignee" TEXT NOT NULL DEFAULT 'Unassigned',
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Complaint" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT,
    "roomId" TEXT,
    "guestName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "public"."Priority" NOT NULL,
    "status" "public"."ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "department" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Invoice" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "bookingId" TEXT,
    "guestId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "roomNumber" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balanceAmount" DECIMAL(12,2) NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitAmount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentGateway" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."GatewayStatus" NOT NULL DEFAULT 'OFFLINE',
    "settlementWindow" TEXT NOT NULL,
    "provider" TEXT,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'CAPTURED',
    "reference" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3),
    "refundReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Receipt" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "public"."PaymentMethod" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Policy" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomCard" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "bookingId" TEXT,
    "guestName" TEXT,
    "status" "public"."CardStatus" NOT NULL DEFAULT 'READY',
    "accessType" "public"."AccessType" NOT NULL,
    "credentialHash" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoomCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NfcAccessEvent" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "event" "public"."AccessEventType" NOT NULL,
    "location" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "NfcAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Blueprint" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1200,
    "height" INTEGER NOT NULL DEFAULT 800,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BlueprintZone" (
    "id" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "roomId" TEXT,
    "label" TEXT NOT NULL,
    "type" "public"."BlueprintZoneType" NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 160,
    "height" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "linkedRef" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "storageKey" TEXT,
    "checksum" TEXT,
    "sizeBytes" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "public"."Priority" NOT NULL,
    "audience" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "vendorId" TEXT,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" "public"."InventoryCategory" NOT NULL,
    "stockOnHand" INTEGER NOT NULL,
    "reorderLevel" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "unitCost" DECIMAL(12,2),
    "storageLocation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShiftHandover" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "department" "public"."Department" NOT NULL,
    "note" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHandover_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NightAudit" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" "public"."NightAuditStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT NOT NULL,
    "roomRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paymentTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "openBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NightAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Integration" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."IntegrationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "configuration" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RagDocument" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "public"."RagDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "checksum" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RagChunk" (
    "id" TEXT NOT NULL,
    "ragDocumentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AiInteraction" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "featureType" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "sourceReferences" JSONB,
    "modelName" TEXT,
    "tokensUsed" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_propertyCode_key" ON "public"."Hotel"("propertyCode");

-- CreateIndex
CREATE INDEX "User_hotelId_role_status_idx" ON "public"."User"("hotelId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "User_hotelId_email_key" ON "public"."User"("hotelId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "User_hotelId_employeeCode_key" ON "public"."User"("hotelId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "public"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "public"."Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "Session_hotelId_revokedAt_idx" ON "public"."Session"("hotelId", "revokedAt");

-- CreateIndex
CREATE INDEX "RoomType_hotelId_active_idx" ON "public"."RoomType"("hotelId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RoomType_hotelId_name_key" ON "public"."RoomType"("hotelId", "name");

-- CreateIndex
CREATE INDEX "Room_hotelId_floor_status_idx" ON "public"."Room"("hotelId", "floor", "status");

-- CreateIndex
CREATE INDEX "Room_hotelId_roomTypeId_status_idx" ON "public"."Room"("hotelId", "roomTypeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hotelId_roomNumber_key" ON "public"."Room"("hotelId", "roomNumber");

-- CreateIndex
CREATE INDEX "RoomStatusLog_hotelId_roomId_createdAt_idx" ON "public"."RoomStatusLog"("hotelId", "roomId", "createdAt");

-- CreateIndex
CREATE INDEX "Guest_hotelId_lastName_firstName_idx" ON "public"."Guest"("hotelId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Guest_hotelId_phone_idx" ON "public"."Guest"("hotelId", "phone");

-- CreateIndex
CREATE INDEX "Guest_hotelId_email_idx" ON "public"."Guest"("hotelId", "email");

-- CreateIndex
CREATE INDEX "GroupReservation_hotelId_createdAt_idx" ON "public"."GroupReservation"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_hotelId_status_checkInAt_idx" ON "public"."Booking"("hotelId", "status", "checkInAt");

-- CreateIndex
CREATE INDEX "Booking_hotelId_status_checkOutAt_idx" ON "public"."Booking"("hotelId", "status", "checkOutAt");

-- CreateIndex
CREATE INDEX "Booking_hotelId_guestId_idx" ON "public"."Booking"("hotelId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_hotelId_code_key" ON "public"."Booking"("hotelId", "code");

-- CreateIndex
CREATE INDEX "HousekeepingTask_hotelId_status_priority_idx" ON "public"."HousekeepingTask"("hotelId", "status", "priority");

-- CreateIndex
CREATE INDEX "HousekeepingTask_hotelId_roomId_idx" ON "public"."HousekeepingTask"("hotelId", "roomId");

-- CreateIndex
CREATE INDEX "Vendor_hotelId_category_active_idx" ON "public"."Vendor"("hotelId", "category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_hotelId_name_key" ON "public"."Vendor"("hotelId", "name");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_hotelId_status_priority_idx" ON "public"."MaintenanceTicket"("hotelId", "status", "priority");

-- CreateIndex
CREATE INDEX "MaintenanceTicket_hotelId_roomId_idx" ON "public"."MaintenanceTicket"("hotelId", "roomId");

-- CreateIndex
CREATE INDEX "Complaint_hotelId_status_priority_idx" ON "public"."Complaint"("hotelId", "status", "priority");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_status_issuedAt_idx" ON "public"."Invoice"("hotelId", "status", "issuedAt");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_bookingId_idx" ON "public"."Invoice"("hotelId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_hotelId_invoiceNumber_key" ON "public"."Invoice"("hotelId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "public"."InvoiceItem"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGateway_hotelId_method_key" ON "public"."PaymentGateway"("hotelId", "method");

-- CreateIndex
CREATE INDEX "Payment_hotelId_status_processedAt_idx" ON "public"."Payment"("hotelId", "status", "processedAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "public"."Payment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_hotelId_receiptNumber_key" ON "public"."Payment"("hotelId", "receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "public"."Receipt"("paymentId");

-- CreateIndex
CREATE INDEX "Receipt_hotelId_issuedAt_idx" ON "public"."Receipt"("hotelId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_hotelId_receiptNumber_key" ON "public"."Receipt"("hotelId", "receiptNumber");

-- CreateIndex
CREATE INDEX "Policy_hotelId_category_active_idx" ON "public"."Policy"("hotelId", "category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_hotelId_title_version_key" ON "public"."Policy"("hotelId", "title", "version");

-- CreateIndex
CREATE INDEX "RoomCard_hotelId_status_idx" ON "public"."RoomCard"("hotelId", "status");

-- CreateIndex
CREATE INDEX "RoomCard_hotelId_roomId_idx" ON "public"."RoomCard"("hotelId", "roomId");

-- CreateIndex
CREATE INDEX "NfcAccessEvent_hotelId_occurredAt_idx" ON "public"."NfcAccessEvent"("hotelId", "occurredAt");

-- CreateIndex
CREATE INDEX "NfcAccessEvent_cardId_occurredAt_idx" ON "public"."NfcAccessEvent"("cardId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_hotelId_floor_key" ON "public"."Blueprint"("hotelId", "floor");

-- CreateIndex
CREATE INDEX "BlueprintZone_blueprintId_type_idx" ON "public"."BlueprintZone"("blueprintId", "type");

-- CreateIndex
CREATE INDEX "Document_hotelId_type_createdAt_idx" ON "public"."Document"("hotelId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Document_hotelId_linkedRef_idx" ON "public"."Document"("hotelId", "linkedRef");

-- CreateIndex
CREATE INDEX "Notification_hotelId_audience_readAt_createdAt_idx" ON "public"."Notification"("hotelId", "audience", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_hotelId_createdAt_idx" ON "public"."AuditLog"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_hotelId_entityType_entityId_idx" ON "public"."AuditLog"("hotelId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "InventoryItem_hotelId_category_active_idx" ON "public"."InventoryItem"("hotelId", "category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_hotelId_sku_key" ON "public"."InventoryItem"("hotelId", "sku");

-- CreateIndex
CREATE INDEX "ShiftHandover_hotelId_department_createdAt_idx" ON "public"."ShiftHandover"("hotelId", "department", "createdAt");

-- CreateIndex
CREATE INDEX "NightAudit_hotelId_status_idx" ON "public"."NightAudit"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NightAudit_hotelId_businessDate_key" ON "public"."NightAudit"("hotelId", "businessDate");

-- CreateIndex
CREATE INDEX "Integration_hotelId_type_enabled_idx" ON "public"."Integration"("hotelId", "type", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_hotelId_name_key" ON "public"."Integration"("hotelId", "name");

-- CreateIndex
CREATE INDEX "RagDocument_hotelId_status_idx" ON "public"."RagDocument"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RagChunk_ragDocumentId_chunkIndex_key" ON "public"."RagChunk"("ragDocumentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "AiInteraction_hotelId_featureType_createdAt_idx" ON "public"."AiInteraction"("hotelId", "featureType", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "public"."RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomStatusLog" ADD CONSTRAINT "RoomStatusLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomStatusLog" ADD CONSTRAINT "RoomStatusLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Guest" ADD CONSTRAINT "Guest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GroupReservation" ADD CONSTRAINT "GroupReservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_groupReservationId_fkey" FOREIGN KEY ("groupReservationId") REFERENCES "public"."GroupReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vendor" ADD CONSTRAINT "Vendor_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceTicket" ADD CONSTRAINT "MaintenanceTicket_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Complaint" ADD CONSTRAINT "Complaint_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Complaint" ADD CONSTRAINT "Complaint_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Complaint" ADD CONSTRAINT "Complaint_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Invoice" ADD CONSTRAINT "Invoice_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "public"."Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentGateway" ADD CONSTRAINT "PaymentGateway_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Receipt" ADD CONSTRAINT "Receipt_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Receipt" ADD CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Policy" ADD CONSTRAINT "Policy_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomCard" ADD CONSTRAINT "RoomCard_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomCard" ADD CONSTRAINT "RoomCard_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomCard" ADD CONSTRAINT "RoomCard_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NfcAccessEvent" ADD CONSTRAINT "NfcAccessEvent_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NfcAccessEvent" ADD CONSTRAINT "NfcAccessEvent_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "public"."RoomCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Blueprint" ADD CONSTRAINT "Blueprint_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlueprintZone" ADD CONSTRAINT "BlueprintZone_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "public"."Blueprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BlueprintZone" ADD CONSTRAINT "BlueprintZone_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftHandover" ADD CONSTRAINT "ShiftHandover_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NightAudit" ADD CONSTRAINT "NightAudit_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Integration" ADD CONSTRAINT "Integration_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RagDocument" ADD CONSTRAINT "RagDocument_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RagChunk" ADD CONSTRAINT "RagChunk_ragDocumentId_fkey" FOREIGN KEY ("ragDocumentId") REFERENCES "public"."RagDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AiInteraction" ADD CONSTRAINT "AiInteraction_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "public"."Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
