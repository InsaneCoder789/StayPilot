import "server-only";

import { randomInt } from "node:crypto";
import type { Prisma, User } from "@prisma/client";

import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

type Actor = Pick<User, "id" | "hotelId" | "name" | "role">;
type Payload = Record<string, unknown>;
type Result = { ok: boolean; message: string; invoiceId?: string; receiptId?: string; logout?: boolean };

const roleCommands: Record<User["role"], string[] | "*"> = {
  HOTEL_ADMIN: "*",
  MANAGER: "*",
  RECEPTIONIST: ["setRoomStatus", "createBooking", "checkInBooking", "checkOutBooking", "createGroupReservation", "createComplaint", "updateComplaintStatus", "createInvoice", "recordPayment", "updateGuestNotes", "issueRoomCard", "updateRoomCardStatus", "recordNfcEvent", "addDocument", "addNotification", "markNotificationRead", "createHandover"],
  HOUSEKEEPING: ["setRoomStatus", "updateHousekeepingStatus", "addInventoryItem", "adjustInventoryItem", "addNotification", "markNotificationRead", "createHandover"],
  MAINTENANCE: ["setRoomStatus", "createMaintenanceTicket", "updateMaintenanceStatus", "addInventoryItem", "adjustInventoryItem", "addVendor", "addDocument", "addNotification", "markNotificationRead", "createHandover"],
  ACCOUNTANT: ["createInvoice", "recordPayment", "refundPayment", "togglePaymentGateway", "addDocument", "markNotificationRead", "runNightAudit"],
};

export function canExecuteHotelCommand(role: User["role"], action: string) {
  const allowed = roleCommands[role];
  return allowed === "*" || allowed.includes(action);
}

const text = (payload: Payload, key: string) => String(payload[key] ?? "").trim();
const number = (payload: Payload, key: string) => Number(payload[key] ?? 0);
const date = (value: unknown) => new Date(`${String(value)}T12:00:00.000Z`);
const code = (prefix: string, digits = 5) => `${prefix}-${new Date().getUTCFullYear()}-${randomInt(10 ** (digits - 1), 10 ** digits)}`;

async function audit(
  tx: Prisma.TransactionClient,
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  target: string,
  oldValue?: Prisma.InputJsonValue,
  newValue?: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action, entityType, entityId, target, oldValue, newValue },
  });
}

export async function executeHotelCommand(actor: Actor, action: string, payload: Payload): Promise<Result> {
  const db = getDb();
  if (!canExecuteHotelCommand(actor.role, action)) return { ok: false, message: "Your role does not permit this operation." };

  switch (action) {
    case "createUser": {
      if (!text(payload, "name") || !text(payload, "email") || text(payload, "password").length < 8) return { ok: false, message: "Name, valid email, and an 8-character password are required." };
      if (!['HOTEL_ADMIN','MANAGER','RECEPTIONIST','HOUSEKEEPING','MAINTENANCE','ACCOUNTANT'].includes(text(payload, "role"))) return { ok: false, message: "Invalid role." };
      const email = text(payload, "email").toLowerCase();
      if (await db.user.findFirst({ where: { hotelId: actor.hotelId, email } })) return { ok: false, message: "A user with this email already exists." };
      const user = await db.user.create({ data: { hotelId: actor.hotelId, name: text(payload, "name"), email, passwordHash: await hashPassword(text(payload, "password")), role: text(payload, "role") as User["role"], status: "ACTIVE", shiftLabel: "Unassigned", workload: "No active allocation" } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "CREATE_USER", entityType: "User", entityId: user.id, target: email } });
      return { ok: true, message: "User added." };
    }
    case "setRoomStatus": {
      const roomId = text(payload, "roomId");
      const next = text(payload, "status") as Prisma.EnumRoomStatusFieldUpdateOperationsInput["set"];
      const room = await db.room.findFirst({ where: { id: roomId, hotelId: actor.hotelId } });
      if (!room) return { ok: false, message: "Room not found." };
      await db.$transaction(async (tx) => {
        await tx.room.update({ where: { id: room.id }, data: { status: next, outOfService: ["MAINTENANCE", "BLOCKED"].includes(String(next)) } });
        await tx.roomStatusLog.create({ data: { hotelId: actor.hotelId, roomId: room.id, oldStatus: room.status, newStatus: next!, userId: actor.id, reason: "Manual room control update" } });
        await audit(tx, actor, "SET_ROOM_STATUS", "Room", room.id, room.roomNumber, { status: room.status }, { status: next as string });
      });
      return { ok: true, message: `Room ${room.roomNumber} updated.` };
    }
    case "createBooking": {
      const guestName = text(payload, "guestName");
      const total = number(payload, "totalAmount");
      if (!guestName || total <= 0 || date(payload.checkOut) <= date(payload.checkIn)) return { ok: false, message: "Complete the guest, dates, and positive room amount." };
      const hotel = await db.hotel.findUniqueOrThrow({ where: { id: actor.hotelId } });
      const names = guestName.split(/\s+/);
      const tax = Math.round(total * (Number(hotel.taxRate) / 100) * 100) / 100;
      const bookingCode = code("BK");
      const invoiceNumber = code("INV", 4);
      await db.$transaction(async (tx) => {
        const guest = await tx.guest.create({ data: { hotelId: actor.hotelId, firstName: names.shift() ?? "Guest", lastName: names.join(" ") || "Walk-in", phone: text(payload, "phone"), email: text(payload, "email"), nationality: "", preferences: [], loyaltyPoints: Math.floor((total + tax) / 10), companyName: text(payload, "companyName") || null } });
        const booking = await tx.booking.create({ data: { hotelId: actor.hotelId, code: bookingCode, guestId: guest.id, guestName, roomTypeName: text(payload, "roomType"), status: "CONFIRMED", source: text(payload, "source") || "DIRECT", checkInAt: date(payload.checkIn), checkOutAt: date(payload.checkOut), totalAmount: total + tax, specialRequests: text(payload, "specialRequests"), companyName: text(payload, "companyName") || null, createdByUserId: actor.id } });
        const invoice = await tx.invoice.create({ data: { hotelId: actor.hotelId, bookingId: booking.id, guestId: guest.id, invoiceNumber, bookingCode, guestName, guestEmail: text(payload, "email") || null, subtotal: total, taxAmount: tax, totalAmount: total + tax, balanceAmount: total + tax, currency: hotel.currency, items: { create: [{ label: "Room charge", unitAmount: total, amount: total, category: "ROOM_CHARGE" }, { label: "Tax", unitAmount: tax, amount: tax, category: "TAX", taxRate: hotel.taxRate }] } } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Invoice ${invoiceNumber}`, type: "INVOICE", linkedRef: invoiceNumber } });
        await tx.notification.create({ data: { hotelId: actor.hotelId, title: "New booking created", message: `${guestName} added under ${bookingCode}.`, severity: "MEDIUM", audience: "RECEPTIONIST" } });
        await audit(tx, actor, "CREATE_BOOKING", "Booking", booking.id, bookingCode);
        await audit(tx, actor, "CREATE_INVOICE", "Invoice", invoice.id, invoiceNumber);
      });
      return { ok: true, message: `${bookingCode} created.` };
    }
    case "checkInBooking": {
      const booking = await db.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId } });
      const room = await db.room.findFirst({ where: { roomNumber: text(payload, "roomNumber"), hotelId: actor.hotelId } });
      if (!booking || !room) return { ok: false, message: "Booking or room not found." };
      if (!['AVAILABLE','RESERVED'].includes(room.status) || room.outOfService) return { ok: false, message: "Only available, in-service rooms can be assigned." };
      await db.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: booking.id }, data: { roomId: room.id, status: "CHECKED_IN", actualCheckInAt: new Date() } });
        await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED", guestName: booking.guestName, nextBookingAt: null } });
        await tx.roomStatusLog.create({ data: { hotelId: actor.hotelId, roomId: room.id, oldStatus: room.status, newStatus: "OCCUPIED", userId: actor.id, reason: `Check-in ${booking.code}` } });
        await audit(tx, actor, "CHECK_IN", "Booking", booking.id, `${booking.code} · Room ${room.roomNumber}`);
      });
      return { ok: true, message: `Checked in to room ${room.roomNumber}.` };
    }
    case "checkOutBooking": {
      const booking = await db.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId }, include: { room: true } });
      if (!booking?.room) return { ok: false, message: "Checked-in booking not found." };
      await db.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_OUT", actualCheckOutAt: new Date() } });
        await tx.room.update({ where: { id: booking.room!.id }, data: { status: "DIRTY", guestName: null, housekeepingNote: "Checkout completed, cleaning required" } });
        await tx.housekeepingTask.create({ data: { hotelId: actor.hotelId, roomId: booking.room!.id, status: "PENDING", priority: "HIGH", checkoutAt: new Date(), assignee: "Unassigned" } });
        await tx.roomCard.updateMany({ where: { hotelId: actor.hotelId, OR: [{ bookingId: booking.id }, { roomId: booking.room!.id }], status: { in: ["ACTIVE", "ENCODED"] } }, data: { status: "EXPIRED", revokedAt: new Date() } });
        await tx.roomStatusLog.create({ data: { hotelId: actor.hotelId, roomId: booking.room!.id, oldStatus: booking.room!.status, newStatus: "DIRTY", userId: actor.id, reason: `Checkout ${booking.code}` } });
        await tx.guest.update({ where: { id: booking.guestId }, data: { stayCount: { increment: 1 } } });
        await audit(tx, actor, "CHECK_OUT", "Booking", booking.id, booking.code);
      });
      return { ok: true, message: `Checkout completed for ${booking.code}.` };
    }
    case "createGroupReservation": {
      const group = await db.groupReservation.create({ data: { hotelId: actor.hotelId, groupName: text(payload, "groupName"), companyName: text(payload, "companyName") || null, roomCount: number(payload, "roomCount") } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "CREATE_GROUP_RESERVATION", entityType: "GroupReservation", entityId: group.id, target: group.groupName } });
      return { ok: true, message: "Group reservation created." };
    }
    case "updateHousekeepingStatus": {
      const task = await db.housekeepingTask.findFirst({ where: { id: text(payload, "taskId"), hotelId: actor.hotelId }, include: { room: true } });
      if (!task) return { ok: false, message: "Housekeeping task not found." };
      const status = text(payload, "status") as "PENDING" | "IN_PROGRESS" | "COMPLETED";
      const roomStatus = status === "COMPLETED" ? "AVAILABLE" : status === "IN_PROGRESS" ? "CLEANING" : "DIRTY";
      await db.$transaction(async (tx) => {
        await tx.housekeepingTask.update({ where: { id: task.id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null, checklistComplete: status === "COMPLETED" } });
        await tx.room.update({ where: { id: task.roomId }, data: { status: roomStatus, housekeepingNote: status === "COMPLETED" ? "Ready for assignment" : task.room.housekeepingNote } });
        await tx.roomStatusLog.create({ data: { hotelId: actor.hotelId, roomId: task.roomId, oldStatus: task.room.status, newStatus: roomStatus, userId: actor.id, reason: "Housekeeping workflow" } });
        await audit(tx, actor, "UPDATE_HOUSEKEEPING", "HousekeepingTask", task.id, task.room.roomNumber);
      });
      return { ok: true, message: `Room ${task.room.roomNumber} housekeeping updated.` };
    }
    case "createMaintenanceTicket": {
      const room = text(payload, "roomNumber") ? await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "roomNumber") } }) : null;
      const vendor = text(payload, "vendorName") ? await db.vendor.findFirst({ where: { hotelId: actor.hotelId, name: text(payload, "vendorName") } }) : null;
      await db.$transaction(async (tx) => {
        const ticket = await tx.maintenanceTicket.create({ data: { hotelId: actor.hotelId, roomId: room?.id, vendorId: vendor?.id, title: text(payload, "title"), category: text(payload, "category"), priority: text(payload, "priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT", assignee: text(payload, "assignee") || "Unassigned", description: text(payload, "description") } });
        if (room) await tx.room.update({ where: { id: room.id }, data: { status: "MAINTENANCE", outOfService: true, housekeepingNote: ticket.title } });
        await tx.notification.create({ data: { hotelId: actor.hotelId, title: "Maintenance created", message: ticket.title, severity: ticket.priority, audience: "MAINTENANCE" } });
        await audit(tx, actor, "CREATE_MAINTENANCE", "MaintenanceTicket", ticket.id, ticket.title);
      });
      return { ok: true, message: "Maintenance ticket created." };
    }
    case "updateMaintenanceStatus": {
      const ticket = await db.maintenanceTicket.findFirst({ where: { id: text(payload, "ticketId"), hotelId: actor.hotelId }, include: { room: true } });
      if (!ticket) return { ok: false, message: "Maintenance ticket not found." };
      const status = text(payload, "status") as "OPEN" | "IN_PROGRESS" | "RESOLVED";
      await db.$transaction(async (tx) => {
        await tx.maintenanceTicket.update({ where: { id: ticket.id }, data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null } });
        if (ticket.room) await tx.room.update({ where: { id: ticket.room.id }, data: { status: status === "RESOLVED" ? "DIRTY" : "MAINTENANCE", outOfService: status !== "RESOLVED", housekeepingNote: status === "RESOLVED" ? "Repair resolved, inspection before release" : ticket.room.housekeepingNote } });
        await audit(tx, actor, "UPDATE_MAINTENANCE", "MaintenanceTicket", ticket.id, ticket.title);
      });
      return { ok: true, message: "Maintenance status updated." };
    }
    case "createComplaint": {
      const message = text(payload, "message");
      const lowered = message.toLowerCase();
      const category = lowered.includes("ac") || lowered.includes("water") ? "Maintenance" : lowered.includes("towel") || lowered.includes("clean") ? "Housekeeping" : "Front Desk";
      const priority = lowered.includes("not working") || lowered.includes("urgent") ? "HIGH" : "MEDIUM";
      const room = text(payload, "roomNumber") ? await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "roomNumber") } }) : null;
      const complaint = await db.complaint.create({ data: { hotelId: actor.hotelId, roomId: room?.id, guestName: text(payload, "guestName"), category, priority, department: category === "Maintenance" ? "Engineering" : category === "Housekeeping" ? "Housekeeping" : "Reception", message } });
      await db.notification.create({ data: { hotelId: actor.hotelId, title: "Complaint logged", message: `${complaint.guestName}: ${message}`, severity: priority, audience: "MANAGER" } });
      return { ok: true, message: "Guest issue logged." };
    }
    case "updateComplaintStatus": {
      const complaint = await db.complaint.findFirst({ where: { id: text(payload, "complaintId"), hotelId: actor.hotelId } });
      if (!complaint) return { ok: false, message: "Guest issue not found." };
      const status = text(payload, "status") as "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
      await db.complaint.update({ where: { id: complaint.id }, data: { status, resolvedAt: status === "RESOLVED" ? new Date() : null } });
      return { ok: true, message: "Guest issue updated." };
    }
    case "createInvoice": {
      const lines = Array.isArray(payload.lineItems) ? payload.lineItems.filter((item): item is { label: string; amount: number } => Boolean(item && typeof item === "object" && "label" in item && "amount" in item)).map((item) => ({ label: String(item.label).trim(), amount: Number(item.amount) })).filter((item) => item.label && item.amount !== 0) : [];
      const total = lines.reduce((sum, item) => sum + item.amount, 0);
      if (!text(payload, "guestName") || total <= 0) return { ok: false, message: "Add a guest name and at least one positive line item." };
      const invoiceNumber = code("INV", 4);
      const invoice = await db.$transaction(async (tx) => {
        const row = await tx.invoice.create({ data: { hotelId: actor.hotelId, invoiceNumber, bookingCode: text(payload, "bookingCode") || "DIRECT-FOLIO", guestName: text(payload, "guestName"), guestEmail: text(payload, "guestEmail") || null, roomNumber: text(payload, "roomNumber") || null, subtotal: total, totalAmount: total, balanceAmount: total, dueAt: text(payload, "dueDate") ? date(payload.dueDate) : null, notes: text(payload, "notes") || null, createdByUserId: actor.id, items: { create: lines.map((line) => ({ label: line.label, unitAmount: line.amount, amount: line.amount })) } } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Invoice ${invoiceNumber}`, type: "INVOICE", linkedRef: invoiceNumber } });
        await audit(tx, actor, "CREATE_INVOICE", "Invoice", row.id, invoiceNumber);
        return row;
      });
      return { ok: true, message: `${invoiceNumber} created.`, invoiceId: invoice.id };
    }
    case "recordPayment": {
      const invoice = await db.invoice.findFirst({ where: { id: text(payload, "invoiceId"), hotelId: actor.hotelId } });
      const method = (text(payload, "paymentMethod") || "CASH") as "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTA_VCC";
      const gateway = await db.paymentGateway.findUnique({ where: { hotelId_method: { hotelId: actor.hotelId, method } } });
      if (!invoice) return { ok: false, message: "Invoice not found." };
      if (!gateway?.enabled || gateway.status !== "READY") return { ok: false, message: `${method.replaceAll("_", " ")} gateway is offline.` };
      const requested = number(payload, "amount");
      if (requested <= 0 || Number(invoice.balanceAmount) <= 0) return { ok: false, message: "Enter a positive amount against an open balance." };
      const amount = Math.min(requested, Number(invoice.balanceAmount));
      const receiptNumber = code("RCT");
      const receipt = await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({ data: { hotelId: actor.hotelId, invoiceId: invoice.id, receiptNumber, guestName: invoice.guestName, amount, method, reference: text(payload, "reference") || `${method}-${randomInt(10_000_000, 99_999_999)}`, processedBy: actor.name } });
        const paidAmount = Number(invoice.paidAmount) + amount;
        const balanceAmount = Math.max(Number(invoice.totalAmount) - paidAmount, 0);
        await tx.invoice.update({ where: { id: invoice.id }, data: { paidAmount, balanceAmount, status: balanceAmount === 0 ? "PAID" : "PARTIAL" } });
        const row = await tx.receipt.create({ data: { hotelId: actor.hotelId, paymentId: payment.id, invoiceId: invoice.id, receiptNumber, invoiceNumber: invoice.invoiceNumber, guestName: invoice.guestName, amount, method } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Receipt ${receiptNumber}`, type: "RECEIPT", linkedRef: invoice.invoiceNumber } });
        await audit(tx, actor, "CAPTURE_PAYMENT", "Payment", payment.id, `${receiptNumber} · AED ${amount.toFixed(2)}`);
        return row;
      }, { isolationLevel: "Serializable" });
      return { ok: true, message: `${receiptNumber} issued.`, receiptId: receipt.id };
    }
    case "refundPayment": {
      const payment = await db.payment.findFirst({ where: { id: text(payload, "paymentId"), hotelId: actor.hotelId }, include: { invoice: true } });
      if (!payment) return { ok: false, message: "Payment not found." };
      if (payment.status === "REFUNDED") return { ok: false, message: "Payment has already been refunded." };
      await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", refundedAt: new Date(), refundReference: code("REF") } });
        const paidAmount = Math.max(Number(payment.invoice.paidAmount) - Number(payment.amount), 0);
        const balanceAmount = Math.max(Number(payment.invoice.totalAmount) - paidAmount, 0);
        await tx.invoice.update({ where: { id: payment.invoiceId }, data: { paidAmount, balanceAmount, status: paidAmount === 0 ? "UNPAID" : "PARTIAL" } });
        await audit(tx, actor, "REFUND_PAYMENT", "Payment", payment.id, payment.receiptNumber);
      }, { isolationLevel: "Serializable" });
      return { ok: true, message: `${payment.receiptNumber} refunded.` };
    }
    case "togglePaymentGateway": {
      const gateway = await db.paymentGateway.findFirst({ where: { id: text(payload, "gatewayId"), hotelId: actor.hotelId } });
      if (!gateway) return { ok: false, message: "Gateway not found." };
      await db.paymentGateway.update({ where: { id: gateway.id }, data: { enabled: !gateway.enabled, status: gateway.enabled ? "OFFLINE" : "READY" } });
      return { ok: true, message: "Gateway updated." };
    }
    case "updateGuestNotes":
      await db.guest.updateMany({ where: { id: text(payload, "guestId"), hotelId: actor.hotelId }, data: { notes: text(payload, "notes") } });
      return { ok: true, message: "Guest notes updated." };
    case "updateHotelSettings": {
      const settings = payload.settings as Payload;
      const location = text(settings, "location").split(",").map((part) => part.trim());
      const theme = settings.theme as Payload;
      await db.hotel.update({ where: { id: actor.hotelId }, data: { name: text(settings, "hotelName"), city: location[0] || undefined, country: location.slice(1).join(", ") || undefined, checkInTime: text(settings, "checkInTime"), checkOutTime: text(settings, "checkOutTime"), taxRate: number(settings, "taxRate"), timezone: text(settings, "timezone"), phone: text(settings, "phone"), email: text(settings, "email"), themeAccent: text(theme, "accent"), themeSurface: text(theme, "surface"), themeSurfaceStrong: text(theme, "surfaceStrong") } });
      return { ok: true, message: "Property settings saved." };
    }
    case "addPolicy": {
      const policy = await db.policy.create({ data: { hotelId: actor.hotelId, title: text(payload, "title"), category: text(payload, "category"), content: text(payload, "content") } });
      await db.document.create({ data: { hotelId: actor.hotelId, title: policy.title, type: "POLICY", linkedRef: policy.category } });
      return { ok: true, message: "Policy added." };
    }
    case "issueRoomCard": {
      const room = await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "roomNumber") } });
      if (!room) return { ok: false, message: "Room not found." };
      await db.$transaction(async (tx) => {
        const card = await tx.roomCard.create({ data: { hotelId: actor.hotelId, roomId: room.id, guestName: text(payload, "guestName") || null, accessType: text(payload, "accessType") as "NFC" | "MAGSTRIPE" | "RFID", status: "ACTIVE", issuedAt: new Date() } });
        await tx.nfcAccessEvent.create({ data: { hotelId: actor.hotelId, cardId: card.id, event: "ENCODED", location: "Front desk encoder" } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Room card ${room.roomNumber}`, type: "ROOM_CARD_LOG", linkedRef: room.roomNumber } });
        await audit(tx, actor, "ISSUE_ROOM_CARD", "RoomCard", card.id, room.roomNumber);
      });
      return { ok: true, message: `Room ${room.roomNumber} card issued.` };
    }
    case "updateRoomCardStatus": {
      const card = await db.roomCard.findFirst({ where: { id: text(payload, "cardId"), hotelId: actor.hotelId }, include: { room: true } });
      if (!card) return { ok: false, message: "Room card not found." };
      const status = text(payload, "status") as "READY" | "ENCODED" | "ACTIVE" | "EXPIRED";
      await db.$transaction(async (tx) => {
        await tx.roomCard.update({ where: { id: card.id }, data: { status, revokedAt: status === "EXPIRED" ? new Date() : null } });
        if (status === "EXPIRED") await tx.nfcAccessEvent.create({ data: { hotelId: actor.hotelId, cardId: card.id, event: "EXPIRED", location: "Access control console" } });
        await audit(tx, actor, "UPDATE_ROOM_CARD", "RoomCard", card.id, `${card.room.roomNumber} · ${status}`);
      });
      return { ok: true, message: "Room card updated." };
    }
    case "recordNfcEvent": {
      const card = await db.roomCard.findFirst({ where: { id: text(payload, "cardId"), hotelId: actor.hotelId } });
      if (!card) return { ok: false, message: "Room card not found." };
      await db.nfcAccessEvent.create({ data: { hotelId: actor.hotelId, cardId: card.id, event: text(payload, "event") as "ENCODED" | "ACCESS_GRANTED" | "ACCESS_DENIED" | "EXPIRED", location: text(payload, "location") || "Guest room door" } });
      return { ok: true, message: "Access event recorded." };
    }
    case "addBlueprintZone": {
      const blueprint = await db.blueprint.findFirst({ where: { id: text(payload, "blueprintId"), hotelId: actor.hotelId } });
      if (!blueprint) return { ok: false, message: "Blueprint not found." };
      const room = text(payload, "linkedRoomNumber") ? await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "linkedRoomNumber") } }) : null;
      await db.blueprintZone.create({ data: { blueprintId: blueprint.id, roomId: room?.id, label: text(payload, "label"), type: text(payload, "type") as "ROOM" | "LOBBY" | "SERVICE" | "STAIR" | "LIFT" | "AMENITY" } });
      return { ok: true, message: "Blueprint zone added." };
    }
    case "removeBlueprintZone":
      await db.blueprintZone.deleteMany({ where: { id: text(payload, "zoneId"), blueprint: { hotelId: actor.hotelId } } });
      return { ok: true, message: "Blueprint zone removed." };
    case "addDocument":
      await db.document.create({ data: { hotelId: actor.hotelId, title: text(payload, "title"), type: text(payload, "type") as "INVOICE" | "POLICY" | "GUEST_FORM" | "ROOM_CARD_LOG" | "AUDIT" | "HANDOVER" | "RECEIPT" | "BLUEPRINT" | "OTHER", linkedRef: text(payload, "linkedRef") } });
      return { ok: true, message: "Document record added." };
    case "addInventoryItem": {
      const vendor = text(payload, "vendorName") ? await db.vendor.findFirst({ where: { hotelId: actor.hotelId, name: text(payload, "vendorName") } }) : null;
      await db.inventoryItem.create({ data: { hotelId: actor.hotelId, vendorId: vendor?.id, name: text(payload, "name"), category: text(payload, "category") as "LINEN" | "AMENITY" | "MINIBAR" | "HOUSEKEEPING" | "ENGINEERING", stockOnHand: number(payload, "stockOnHand"), reorderLevel: number(payload, "reorderLevel") } });
      return { ok: true, message: "Inventory item added." };
    }
    case "adjustInventoryItem":
      await db.inventoryItem.updateMany({ where: { id: text(payload, "itemId"), hotelId: actor.hotelId }, data: { stockOnHand: Math.max(0, number(payload, "nextStock")) } });
      return { ok: true, message: "Inventory adjusted." };
    case "addVendor":
      await db.vendor.create({ data: { hotelId: actor.hotelId, name: text(payload, "name"), category: text(payload, "category") as "HVAC" | "PLUMBING" | "LINEN" | "IT" | "SUPPLIER", contact: text(payload, "contact"), sla: text(payload, "sla") } });
      return { ok: true, message: "Vendor added." };
    case "addNotification":
      await db.notification.create({ data: { hotelId: actor.hotelId, title: text(payload, "title"), message: text(payload, "message"), severity: text(payload, "severity") as "LOW" | "MEDIUM" | "HIGH" | "URGENT", audience: text(payload, "audience") } });
      return { ok: true, message: "Notification added." };
    case "markNotificationRead":
      await db.notification.updateMany({ where: { id: text(payload, "notificationId"), hotelId: actor.hotelId }, data: { readAt: new Date() } });
      return { ok: true, message: "Notification read." };
    case "createHandover": {
      const handover = await db.shiftHandover.create({ data: { hotelId: actor.hotelId, department: text(payload, "department") as "FRONT_DESK" | "HOUSEKEEPING" | "MAINTENANCE", note: text(payload, "note"), author: text(payload, "author") || actor.name } });
      await db.document.create({ data: { hotelId: actor.hotelId, title: `${handover.department} handover`, type: "HANDOVER", linkedRef: handover.department } });
      return { ok: true, message: "Shift handover created." };
    }
    case "runNightAudit": {
      const businessDate = new Date(); businessDate.setUTCHours(0,0,0,0);
      const [payments, invoices, bookings, unread] = await Promise.all([db.payment.aggregate({ where: { hotelId: actor.hotelId, status: "CAPTURED" }, _sum: { amount: true } }), db.invoice.aggregate({ where: { hotelId: actor.hotelId }, _sum: { balanceAmount: true, totalAmount: true } }), db.booking.count({ where: { hotelId: actor.hotelId } }), db.notification.count({ where: { hotelId: actor.hotelId, readAt: null } })]);
      const auditRow = await db.nightAudit.upsert({ where: { hotelId_businessDate: { hotelId: actor.hotelId, businessDate } }, update: { status: "COMPLETED", summary: `Closed ${bookings} bookings, with ${unread} open alerts.`, roomRevenue: invoices._sum.totalAmount ?? 0, paymentTotal: payments._sum.amount ?? 0, openBalance: invoices._sum.balanceAmount ?? 0, completedBy: actor.name, completedAt: new Date() }, create: { hotelId: actor.hotelId, businessDate, status: "COMPLETED", summary: `Closed ${bookings} bookings, with ${unread} open alerts.`, roomRevenue: invoices._sum.totalAmount ?? 0, paymentTotal: payments._sum.amount ?? 0, openBalance: invoices._sum.balanceAmount ?? 0, completedBy: actor.name, completedAt: new Date() } });
      await db.document.create({ data: { hotelId: actor.hotelId, title: `Night audit ${businessDate.toISOString().slice(0,10)}`, type: "AUDIT", linkedRef: auditRow.id } });
      return { ok: true, message: "Night audit completed." };
    }
    case "toggleIntegration": {
      const integration = await db.integration.findFirst({ where: { id: text(payload, "integrationId"), hotelId: actor.hotelId } });
      if (!integration) return { ok: false, message: "Integration not found." };
      await db.integration.update({ where: { id: integration.id }, data: { enabled: !integration.enabled, status: integration.enabled ? "READY" : "CONNECTED" } });
      return { ok: true, message: "Integration updated." };
    }
    case "resetHotelData": {
      if (actor.role !== "HOTEL_ADMIN") return { ok: false, message: "Only the hotel administrator can reset operational data." };
      await db.$transaction(async (tx) => {
        await tx.nfcAccessEvent.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.roomCard.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.receipt.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.payment.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.invoiceItem.deleteMany({ where: { invoice: { hotelId: actor.hotelId } } });
        await tx.invoice.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.complaint.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.maintenanceTicket.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.housekeepingTask.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.booking.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.groupReservation.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.guest.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.notification.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.shiftHandover.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.aiInteraction.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.roomStatusLog.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.nightAudit.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.document.deleteMany({ where: { hotelId: actor.hotelId, type: { notIn: ["POLICY", "BLUEPRINT"] } } });
        await tx.room.updateMany({ where: { hotelId: actor.hotelId }, data: { status: "AVAILABLE", guestName: null, nextBookingAt: null, housekeepingNote: null, outOfService: false } });
        await tx.auditLog.deleteMany({ where: { hotelId: actor.hotelId } });
        const businessDate = new Date();
        businessDate.setUTCHours(0, 0, 0, 0);
        await tx.nightAudit.create({ data: { hotelId: actor.hotelId, businessDate, status: "PENDING", summary: "Awaiting first end-of-day close." } });
      });
      return { ok: true, message: "Operational data reset. Property structure and access accounts were preserved." };
    }
    default:
      return { ok: false, message: "Unsupported hotel command." };
  }
}
