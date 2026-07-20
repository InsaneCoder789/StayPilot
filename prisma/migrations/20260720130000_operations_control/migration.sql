CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'ADJUSTMENT', 'WASTE', 'TRANSFER');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
CREATE TYPE "LostFoundStatus" AS ENUM ('REPORTED', 'STORED', 'CLAIMED', 'RETURNED', 'DISPOSED');

CREATE TABLE "OperationalTask" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priority" "Priority" NOT NULL,
  "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
  "assignee" TEXT NOT NULL DEFAULT 'Unassigned',
  "dueAt" TIMESTAMP(3),
  "sourceType" TEXT,
  "sourceId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "poNumber" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "requestedBy" TEXT NOT NULL,
  "approvedBy" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "orderedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantityOrdered" INTEGER NOT NULL,
  "quantityReceived" INTEGER NOT NULL DEFAULT 0,
  "unitCost" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "resultingStock" INTEGER NOT NULL,
  "reference" TEXT,
  "note" TEXT,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Incident" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "roomId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "Priority" NOT NULL,
  "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
  "reportedBy" TEXT NOT NULL,
  "assignedTo" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LostFoundItem" (
  "id" TEXT NOT NULL,
  "hotelId" TEXT NOT NULL,
  "roomId" TEXT,
  "itemCode" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "foundLocation" TEXT NOT NULL,
  "storageLocation" TEXT,
  "status" "LostFoundStatus" NOT NULL DEFAULT 'REPORTED',
  "guestName" TEXT,
  "guestContact" TEXT,
  "foundAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LostFoundItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalTask_hotelId_status_priority_dueAt_idx" ON "OperationalTask"("hotelId", "status", "priority", "dueAt");
CREATE INDEX "OperationalTask_hotelId_department_createdAt_idx" ON "OperationalTask"("hotelId", "department", "createdAt");
CREATE INDEX "PurchaseOrder_hotelId_status_createdAt_idx" ON "PurchaseOrder"("hotelId", "status", "createdAt");
CREATE INDEX "PurchaseOrder_vendorId_status_idx" ON "PurchaseOrder"("vendorId", "status");
CREATE UNIQUE INDEX "PurchaseOrder_hotelId_poNumber_key" ON "PurchaseOrder"("hotelId", "poNumber");
CREATE INDEX "PurchaseOrderLine_inventoryItemId_idx" ON "PurchaseOrderLine"("inventoryItemId");
CREATE UNIQUE INDEX "PurchaseOrderLine_purchaseOrderId_inventoryItemId_key" ON "PurchaseOrderLine"("purchaseOrderId", "inventoryItemId");
CREATE INDEX "InventoryMovement_hotelId_createdAt_idx" ON "InventoryMovement"("hotelId", "createdAt");
CREATE INDEX "InventoryMovement_inventoryItemId_createdAt_idx" ON "InventoryMovement"("inventoryItemId", "createdAt");
CREATE INDEX "Incident_hotelId_status_severity_occurredAt_idx" ON "Incident"("hotelId", "status", "severity", "occurredAt");
CREATE INDEX "LostFoundItem_hotelId_status_foundAt_idx" ON "LostFoundItem"("hotelId", "status", "foundAt");
CREATE UNIQUE INDEX "LostFoundItem_hotelId_itemCode_key" ON "LostFoundItem"("hotelId", "itemCode");

ALTER TABLE "OperationalTask" ADD CONSTRAINT "OperationalTask_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LostFoundItem" ADD CONSTRAINT "LostFoundItem_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LostFoundItem" ADD CONSTRAINT "LostFoundItem_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
