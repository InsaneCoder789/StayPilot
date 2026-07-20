import "server-only";

import type { Prisma, User } from "@/generated/prisma/client";

import { applyPayment, applyRefund, calculateTax } from "@/domain/finance";
import { getStripe } from "@/integrations/payments/stripe";
import { passwordPolicyError } from "@/domain/password-policy";
import { normalizeBusinessDate, stayNights } from "@/domain/reservations";
import { hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { nextDocumentCode } from "@/server/document-sequence";
import { captureInvoicePayment } from "@/server/payment-service";

type Actor = Pick<User, "id" | "hotelId" | "name" | "role">;
type Payload = Record<string, unknown>;
type Result = { ok: boolean; message: string; invoiceId?: string; receiptId?: string; logout?: boolean };

const roleCommands: Record<User["role"], string[] | "*"> = {
  HOTEL_ADMIN: "*",
  MANAGER: "*",
  RECEPTIONIST: ["setRoomStatus", "createBooking", "assignBookingRoom", "updateBookingDates", "cancelBooking", "markBookingNoShow", "checkInBooking", "checkOutBooking", "extendStay", "moveRoom", "createGroupReservation", "createComplaint", "updateComplaintStatus", "createOperationalTask", "updateOperationalTask", "createIncident", "updateIncident", "createLostFoundItem", "updateLostFoundItem", "createInvoice", "recordPayment", "openCashierShift", "recordCashMovement", "closeCashierShift", "sendCommunication", "updateGuestNotes", "issueRoomCard", "updateRoomCardStatus", "recordNfcEvent", "addDocument", "addNotification", "markNotificationRead", "createHandover"],
  HOUSEKEEPING: ["setRoomStatus", "updateHousekeepingStatus", "createOperationalTask", "updateOperationalTask", "createLostFoundItem", "updateLostFoundItem", "addInventoryItem", "adjustInventoryItem", "addNotification", "markNotificationRead", "createHandover"],
  MAINTENANCE: ["setRoomStatus", "createMaintenanceTicket", "updateMaintenanceStatus", "createOperationalTask", "updateOperationalTask", "createIncident", "updateIncident", "addInventoryItem", "adjustInventoryItem", "addVendor", "addDocument", "addNotification", "markNotificationRead", "createHandover"],
  ACCOUNTANT: ["createInvoice", "recordPayment", "refundPayment", "createCreditNote", "openCashierShift", "recordCashMovement", "closeCashierShift", "reconcilePayments", "createPurchaseOrder", "updatePurchaseOrderStatus", "receivePurchaseOrder", "createDocumentTemplate", "sendCommunication", "togglePaymentGateway", "addDocument", "markNotificationRead", "runNightAudit"],
};

export function canExecuteHotelCommand(role: User["role"], action: string) {
  const allowed = roleCommands[role];
  return allowed === "*" || allowed.includes(action);
}

const text = (payload: Payload, key: string) => String(payload[key] ?? "").trim();
const number = (payload: Payload, key: string) => Number(payload[key] ?? 0);
const date = (value: unknown) => new Date(`${String(value)}T12:00:00.000Z`);
const statefulSubject = (reference: string) => reference ? `StayPilot update · ${reference}` : "Update from your hotel";

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

async function findRoomConflict(
  tx: Prisma.TransactionClient,
  hotelId: string,
  roomId: string,
  checkInAt: Date,
  checkOutAt: Date,
  excludeBookingId?: string,
) {
  return tx.booking.findFirst({
    where: {
      hotelId,
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      checkInAt: { lt: checkOutAt },
      checkOutAt: { gt: checkInAt },
    },
    select: { id: true, code: true, guestName: true },
  });
}

export async function executeHotelCommand(actor: Actor, action: string, payload: Payload): Promise<Result> {
  const db = getDb();
  if (!canExecuteHotelCommand(actor.role, action)) return { ok: false, message: "Your role does not permit this operation." };

  switch (action) {
    case "createUser": {
      if (actor.role !== "HOTEL_ADMIN") return { ok: false, message: "Administrator access required." };
      if (!text(payload, "name") || !text(payload, "email")) return { ok: false, message: "Name and valid email are required." };
      const policyError = passwordPolicyError(text(payload, "password"));
      if (policyError) return { ok: false, message: policyError };
      if (!['HOTEL_ADMIN','MANAGER','RECEPTIONIST','HOUSEKEEPING','MAINTENANCE','ACCOUNTANT'].includes(text(payload, "role"))) return { ok: false, message: "Invalid role." };
      const email = text(payload, "email").toLowerCase();
      if (await db.user.findFirst({ where: { hotelId: actor.hotelId, email } })) return { ok: false, message: "A user with this email already exists." };
      const user = await db.user.create({ data: { hotelId: actor.hotelId, name: text(payload, "name"), email, passwordHash: await hashPassword(text(payload, "password")), role: text(payload, "role") as User["role"], status: "ACTIVE", shiftLabel: "Unassigned", workload: "No active allocation" } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "CREATE_USER", entityType: "User", entityId: user.id, target: email } });
      return { ok: true, message: "User added." };
    }
    case "setUserStatus": {
      if (actor.role !== "HOTEL_ADMIN") return { ok: false, message: "Administrator access required." };
      const user = await db.user.findFirst({ where: { id: text(payload, "userId"), hotelId: actor.hotelId } });
      const status = text(payload, "status") as "ACTIVE" | "DISABLED";
      if (!user || !["ACTIVE", "DISABLED"].includes(status)) return { ok: false, message: "Invalid staff status update." };
      if (user.id === actor.id && status === "DISABLED") return { ok: false, message: "You cannot disable your own account." };
      await db.$transaction(async (tx) => {
        await tx.user.update({ where: { id: user.id }, data: { status } });
        if (status === "DISABLED") await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
        await audit(tx, actor, "SET_USER_STATUS", "User", user.id, user.email, { status: user.status }, { status });
      });
      return { ok: true, message: `Staff account ${status === "ACTIVE" ? "enabled" : "disabled"}.` };
    }
    case "revokeUserSessions": {
      if (actor.role !== "HOTEL_ADMIN") return { ok: false, message: "Administrator access required." };
      const user = await db.user.findFirst({ where: { id: text(payload, "userId"), hotelId: actor.hotelId } });
      if (!user) return { ok: false, message: "Staff account not found." };
      const revoked = await db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "REVOKE_USER_SESSIONS", entityType: "User", entityId: user.id, target: user.email } });
      return { ok: true, message: `${revoked.count} session${revoked.count === 1 ? "" : "s"} revoked.` };
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
      const tax = calculateTax(total, Number(hotel.taxRate));
      const bookingCode = await db.$transaction(async (tx) => {
        const bookingCode = await nextDocumentCode(tx, actor.hotelId, "BOOKING", "BK");
        const invoiceNumber = await nextDocumentCode(tx, actor.hotelId, "INVOICE", "INV");
        const guest = await tx.guest.create({ data: { hotelId: actor.hotelId, firstName: names.shift() ?? "Guest", lastName: names.join(" ") || "Walk-in", phone: text(payload, "phone"), email: text(payload, "email"), nationality: "", preferences: [], loyaltyPoints: Math.floor((total + tax) / 10), companyName: text(payload, "companyName") || null } });
        const booking = await tx.booking.create({ data: { hotelId: actor.hotelId, code: bookingCode, guestId: guest.id, guestName, roomTypeName: text(payload, "roomType"), status: "CONFIRMED", source: text(payload, "source") || "DIRECT", checkInAt: date(payload.checkIn), checkOutAt: date(payload.checkOut), depositRequired: Math.max(0, Math.min(number(payload, "depositRequired"), total + tax)), totalAmount: total + tax, specialRequests: text(payload, "specialRequests"), companyName: text(payload, "companyName") || null, createdByUserId: actor.id } });
        const invoice = await tx.invoice.create({ data: { hotelId: actor.hotelId, bookingId: booking.id, guestId: guest.id, invoiceNumber, bookingCode, guestName, guestEmail: text(payload, "email") || null, subtotal: total, taxAmount: tax, totalAmount: total + tax, balanceAmount: total + tax, currency: hotel.currency, items: { create: [{ label: "Room charge", unitAmount: total, amount: total, category: "ROOM_CHARGE" }, { label: "Tax", unitAmount: tax, amount: tax, category: "TAX", taxRate: hotel.taxRate }] } } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Invoice ${invoiceNumber}`, type: "INVOICE", linkedRef: invoiceNumber } });
        await tx.notification.create({ data: { hotelId: actor.hotelId, title: "New booking created", message: `${guestName} added under ${bookingCode}.`, severity: "MEDIUM", audience: "RECEPTIONIST" } });
        await audit(tx, actor, "CREATE_BOOKING", "Booking", booking.id, bookingCode);
        await audit(tx, actor, "CREATE_INVOICE", "Invoice", invoice.id, invoiceNumber);
        return bookingCode;
      }, { isolationLevel: "Serializable" });
      return { ok: true, message: `${bookingCode} created.` };
    }
    case "assignBookingRoom": {
      const bookingId = text(payload, "bookingId");
      const roomNumber = text(payload, "roomNumber");
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: bookingId, hotelId: actor.hotelId } });
        const room = await tx.room.findFirst({ where: { roomNumber, hotelId: actor.hotelId }, include: { roomType: true } });
        if (!booking || !room) return { ok: false, message: "Booking or room not found." };
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { ok: false, message: "Only pending or confirmed reservations can be assigned." };
        if (room.outOfService || ["MAINTENANCE", "BLOCKED"].includes(room.status)) return { ok: false, message: "This room is out of service." };
        if (room.roomType.name !== booking.roomTypeName) return { ok: false, message: `Room ${room.roomNumber} does not match ${booking.roomTypeName}.` };
        const conflict = await findRoomConflict(tx, actor.hotelId, room.id, booking.checkInAt, booking.checkOutAt, booking.id);
        if (conflict) return { ok: false, message: `Room ${room.roomNumber} conflicts with ${conflict.code}.` };
        await tx.booking.update({ where: { id: booking.id }, data: { roomId: room.id } });
        await tx.invoice.updateMany({ where: { hotelId: actor.hotelId, bookingId: booking.id }, data: { roomNumber: room.roomNumber } });
        await audit(tx, actor, "ASSIGN_BOOKING_ROOM", "Booking", booking.id, `${booking.code} · Room ${room.roomNumber}`);
        return { ok: true, message: `Room ${room.roomNumber} reserved for ${booking.code}.` };
      }, { isolationLevel: "Serializable" });
    }
    case "updateBookingDates": {
      const checkInAt = normalizeBusinessDate(text(payload, "checkIn"));
      const checkOutAt = normalizeBusinessDate(text(payload, "checkOut"));
      try { stayNights(checkInAt, checkOutAt); } catch { return { ok: false, message: "Checkout must be after check-in." }; }
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId } });
        if (!booking) return { ok: false, message: "Booking not found." };
        if (["CHECKED_OUT", "CANCELLED", "NO_SHOW"].includes(booking.status)) return { ok: false, message: "This reservation can no longer be amended." };
        if (booking.roomId) {
          const conflict = await findRoomConflict(tx, actor.hotelId, booking.roomId, checkInAt, checkOutAt, booking.id);
          if (conflict) return { ok: false, message: `The assigned room conflicts with ${conflict.code}.` };
        }
        await tx.booking.update({ where: { id: booking.id }, data: { checkInAt, checkOutAt } });
        await audit(tx, actor, "UPDATE_BOOKING_DATES", "Booking", booking.id, booking.code, { checkInAt: booking.checkInAt.toISOString(), checkOutAt: booking.checkOutAt.toISOString() }, { checkInAt: checkInAt.toISOString(), checkOutAt: checkOutAt.toISOString() });
        return { ok: true, message: `${booking.code} dates updated.` };
      }, { isolationLevel: "Serializable" });
    }
    case "cancelBooking": {
      const reason = text(payload, "reason");
      if (!reason) return { ok: false, message: "A cancellation reason is required." };
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId } });
        if (!booking) return { ok: false, message: "Booking not found." };
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { ok: false, message: "Only pending or confirmed reservations can be cancelled." };
        await tx.booking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason: reason } });
        await tx.invoice.updateMany({ where: { hotelId: actor.hotelId, bookingId: booking.id, paidAmount: 0 }, data: { status: "VOID", balanceAmount: 0, notes: `Cancelled: ${reason}` } });
        await tx.notification.create({ data: { hotelId: actor.hotelId, title: "Reservation cancelled", message: `${booking.code}: ${reason}`, severity: "MEDIUM", audience: "RECEPTIONIST" } });
        await audit(tx, actor, "CANCEL_BOOKING", "Booking", booking.id, booking.code, { status: booking.status }, { status: "CANCELLED", reason });
        return { ok: true, message: `${booking.code} cancelled.` };
      }, { isolationLevel: "Serializable" });
    }
    case "markBookingNoShow": {
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId } });
        if (!booking) return { ok: false, message: "Booking not found." };
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { ok: false, message: "Only an expected arrival can be marked no-show." };
        await tx.booking.update({ where: { id: booking.id }, data: { status: "NO_SHOW", noShowAt: new Date() } });
        await audit(tx, actor, "MARK_NO_SHOW", "Booking", booking.id, booking.code, { status: booking.status }, { status: "NO_SHOW" });
        return { ok: true, message: `${booking.code} marked no-show.` };
      }, { isolationLevel: "Serializable" });
    }
    case "checkInBooking": {
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId } });
        const room = await tx.room.findFirst({ where: { roomNumber: text(payload, "roomNumber"), hotelId: actor.hotelId }, include: { roomType: true } });
        if (!booking || !room) return { ok: false, message: "Booking or room not found." };
        if (!["PENDING", "CONFIRMED"].includes(booking.status)) return { ok: false, message: "This reservation is not eligible for check-in." };
        if (!['AVAILABLE','RESERVED'].includes(room.status) || room.outOfService) return { ok: false, message: "Only available, in-service rooms can be assigned." };
        if (room.roomType.name !== booking.roomTypeName) return { ok: false, message: `Room ${room.roomNumber} does not match ${booking.roomTypeName}.` };
        const conflict = await findRoomConflict(tx, actor.hotelId, room.id, booking.checkInAt, booking.checkOutAt, booking.id);
        if (conflict) return { ok: false, message: `Room ${room.roomNumber} conflicts with ${conflict.code}.` };
        await tx.booking.update({ where: { id: booking.id }, data: { roomId: room.id, status: "CHECKED_IN", actualCheckInAt: new Date() } });
        await tx.room.update({ where: { id: room.id }, data: { status: "OCCUPIED", guestName: booking.guestName, nextBookingAt: null } });
        await tx.invoice.updateMany({ where: { hotelId: actor.hotelId, bookingId: booking.id }, data: { roomNumber: room.roomNumber } });
        await tx.roomStatusLog.create({ data: { hotelId: actor.hotelId, roomId: room.id, oldStatus: room.status, newStatus: "OCCUPIED", userId: actor.id, reason: `Check-in ${booking.code}` } });
        await audit(tx, actor, "CHECK_IN", "Booking", booking.id, `${booking.code} · Room ${room.roomNumber}`);
        return { ok: true, message: `Checked in to room ${room.roomNumber}.` };
      }, { isolationLevel: "Serializable" });
    }
    case "checkOutBooking": {
      const booking = await db.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId }, include: { room: true } });
      if (!booking?.room || booking.status !== "CHECKED_IN") return { ok: false, message: "Checked-in booking not found." };
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
    case "extendStay": {
      const nextCheckOut = normalizeBusinessDate(text(payload, "checkOut"));
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId }, include: { room: true } });
        if (!booking?.room || booking.status !== "CHECKED_IN") return { ok: false, message: "An active checked-in stay is required." };
        if (nextCheckOut <= booking.checkOutAt) return { ok: false, message: "The new checkout must extend the current stay." };
        const conflict = await findRoomConflict(tx, actor.hotelId, booking.room.id, booking.checkInAt, nextCheckOut, booking.id);
        if (conflict) return { ok: false, message: `Room ${booking.room.roomNumber} is committed to ${conflict.code}.` };
        await tx.booking.update({ where: { id: booking.id }, data: { checkOutAt: nextCheckOut } });
        await audit(tx, actor, "EXTEND_STAY", "Booking", booking.id, booking.code, { checkOutAt: booking.checkOutAt.toISOString() }, { checkOutAt: nextCheckOut.toISOString() });
        return { ok: true, message: `${booking.code} extended to ${nextCheckOut.toISOString().slice(0, 10)}.` };
      }, { isolationLevel: "Serializable" });
    }
    case "moveRoom": {
      const targetRoomNumber = text(payload, "roomNumber");
      return db.$transaction(async (tx) => {
        const booking = await tx.booking.findFirst({ where: { id: text(payload, "bookingId"), hotelId: actor.hotelId }, include: { room: true } });
        const target = await tx.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: targetRoomNumber }, include: { roomType: true } });
        if (!booking?.room || booking.status !== "CHECKED_IN" || !target) return { ok: false, message: "Active stay or target room not found." };
        if (target.id === booking.room.id) return { ok: false, message: "The guest is already in this room." };
        if (target.status !== "AVAILABLE" || target.outOfService) return { ok: false, message: "The target room must be available and in service." };
        if (target.roomType.name !== booking.roomTypeName) return { ok: false, message: `Room ${target.roomNumber} does not match ${booking.roomTypeName}.` };
        const conflict = await findRoomConflict(tx, actor.hotelId, target.id, booking.checkInAt, booking.checkOutAt, booking.id);
        if (conflict) return { ok: false, message: `Room ${target.roomNumber} conflicts with ${conflict.code}.` };
        const oldRoom = booking.room;
        await tx.booking.update({ where: { id: booking.id }, data: { roomId: target.id } });
        await tx.room.update({ where: { id: oldRoom.id }, data: { status: "DIRTY", guestName: null, housekeepingNote: `Room move for ${booking.code}` } });
        await tx.room.update({ where: { id: target.id }, data: { status: "OCCUPIED", guestName: booking.guestName } });
        await tx.housekeepingTask.create({ data: { hotelId: actor.hotelId, roomId: oldRoom.id, status: "PENDING", priority: "HIGH", taskType: "ROOM_MOVE_CLEANING", assignee: "Unassigned" } });
        await tx.roomCard.updateMany({ where: { hotelId: actor.hotelId, roomId: oldRoom.id, status: { in: ["ACTIVE", "ENCODED"] } }, data: { status: "EXPIRED", revokedAt: new Date() } });
        await tx.invoice.updateMany({ where: { hotelId: actor.hotelId, bookingId: booking.id }, data: { roomNumber: target.roomNumber } });
        await tx.roomStatusLog.createMany({ data: [
          { hotelId: actor.hotelId, roomId: oldRoom.id, oldStatus: oldRoom.status, newStatus: "DIRTY", userId: actor.id, reason: `Room move ${booking.code}` },
          { hotelId: actor.hotelId, roomId: target.id, oldStatus: target.status, newStatus: "OCCUPIED", userId: actor.id, reason: `Room move ${booking.code}` },
        ] });
        await audit(tx, actor, "MOVE_ROOM", "Booking", booking.id, booking.code, { roomNumber: oldRoom.roomNumber }, { roomNumber: target.roomNumber });
        return { ok: true, message: `${booking.code} moved to room ${target.roomNumber}. Reissue the room card.` };
      }, { isolationLevel: "Serializable" });
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
      const invoice = await db.$transaction(async (tx) => {
        const invoiceNumber = await nextDocumentCode(tx, actor.hotelId, "INVOICE", "INV");
        const row = await tx.invoice.create({ data: { hotelId: actor.hotelId, invoiceNumber, bookingCode: text(payload, "bookingCode") || "DIRECT-FOLIO", guestName: text(payload, "guestName"), guestEmail: text(payload, "guestEmail") || null, roomNumber: text(payload, "roomNumber") || null, subtotal: total, totalAmount: total, balanceAmount: total, dueAt: text(payload, "dueDate") ? date(payload.dueDate) : null, notes: text(payload, "notes") || null, createdByUserId: actor.id, items: { create: lines.map((line) => ({ label: line.label, unitAmount: line.amount, amount: line.amount })) } } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Invoice ${invoiceNumber}`, type: "INVOICE", linkedRef: invoiceNumber } });
        await audit(tx, actor, "CREATE_INVOICE", "Invoice", row.id, invoiceNumber);
        return row;
      });
      return { ok: true, message: `${invoice.invoiceNumber} created.`, invoiceId: invoice.id };
    }
    case "recordPayment": {
      const invoice = await db.invoice.findFirst({ where: { id: text(payload, "invoiceId"), hotelId: actor.hotelId } });
      const method = (text(payload, "paymentMethod") || "CASH") as "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTA_VCC";
      const gateway = await db.paymentGateway.findUnique({ where: { hotelId_method: { hotelId: actor.hotelId, method } } });
      if (!invoice) return { ok: false, message: "Invoice not found." };
      if (!gateway?.enabled || gateway.status !== "READY") return { ok: false, message: `${method.replaceAll("_", " ")} gateway is offline.` };
      const cashierShift = method === "CASH" ? await db.cashierShift.findFirst({ where: { hotelId: actor.hotelId, openedBy: actor.id, status: "OPEN" } }) : null;
      if (method === "CASH" && !cashierShift) return { ok: false, message: "Open your cashier shift before accepting cash." };
      const requested = number(payload, "amount");
      if (requested <= 0 || Number(invoice.balanceAmount) <= 0) return { ok: false, message: "Enter a positive amount against an open balance." };
      const paymentState = applyPayment(Number(invoice.totalAmount), Number(invoice.paidAmount), requested);
      const payment = await captureInvoicePayment({
        hotelId: actor.hotelId,
        invoiceId: invoice.id,
        amount: paymentState.captured,
        method,
        reference: text(payload, "reference") || `MANUAL-${crypto.randomUUID()}`,
        processedBy: actor.name,
        actorId: actor.id,
        cashierShiftId: cashierShift?.id,
      });
      return { ok: true, message: `${payment.receiptNumber} issued.` };
    }
    case "refundPayment": {
      const payment = await db.payment.findFirst({ where: { id: text(payload, "paymentId"), hotelId: actor.hotelId }, include: { invoice: true } });
      if (!payment) return { ok: false, message: "Payment not found." };
      if (payment.status === "REFUNDED") return { ok: false, message: "Payment has already been refunded." };
      const available = Number(payment.amount) - Number(payment.amountRefunded);
      const amount = number(payload, "amount") || available;
      if (amount <= 0 || amount > available) return { ok: false, message: `Refund must be between 0.01 and ${available.toFixed(2)}.` };
      const refundReference = await db.$transaction((tx) => nextDocumentCode(tx, actor.hotelId, "REFUND", "REF"));
      if (payment.provider === "STRIPE") {
        if (!payment.providerPaymentId) return { ok: false, message: "Stripe payment reference is missing." };
        try {
          await getStripe().refunds.create({ payment_intent: payment.providerPaymentId, amount: Math.round(amount * 100), metadata: { hotel_id: actor.hotelId, payment_id: payment.id, refund_reference: refundReference } }, { idempotencyKey: refundReference });
        } catch (error) {
          console.error("Stripe refund failed", error);
          return { ok: false, message: "Stripe rejected the refund; no local ledger changes were made." };
        }
      }
      await db.$transaction(async (tx) => {
        const refunded = Number(payment.amountRefunded) + amount;
        const fullyRefunded = Math.abs(refunded - Number(payment.amount)) < 0.001;
        await tx.payment.update({ where: { id: payment.id }, data: { status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED", refundedAt: new Date(), refundReference, amountRefunded: refunded } });
        const refundState = applyRefund(
          Number(payment.invoice.totalAmount),
          Number(payment.invoice.paidAmount),
          amount,
        );
        await tx.invoice.update({
          where: { id: payment.invoiceId },
          data: { paidAmount: refundState.paid, balanceAmount: refundState.balance, status: refundState.status },
        });
        if (payment.invoice.bookingId) {
          await tx.booking.update({
            where: { id: payment.invoice.bookingId },
            data: { advancePaid: refundState.paid, paymentStatus: refundState.status },
          });
        }
        await audit(tx, actor, "REFUND_PAYMENT", "Payment", payment.id, `${refundReference} · ${payment.invoice.currency} ${amount.toFixed(2)}`);
      }, { isolationLevel: "Serializable" });
      return { ok: true, message: `${refundReference} issued for ${amount.toFixed(2)}.` };
    }
    case "createCreditNote": {
      const invoice = await db.invoice.findFirst({ where: { id: text(payload, "invoiceId"), hotelId: actor.hotelId } });
      const amount = number(payload, "amount");
      const reason = text(payload, "reason");
      if (!invoice) return { ok: false, message: "Invoice not found." };
      if (!reason || amount <= 0 || amount > Number(invoice.balanceAmount)) return { ok: false, message: "Credit amount must be positive, within the open balance, and include a reason." };
      const note = await db.$transaction(async (tx) => {
        const creditNoteNumber = await nextDocumentCode(tx, actor.hotelId, "CREDIT_NOTE", "CRN");
        const totalAmount = Number(invoice.totalAmount) - amount;
        const balanceAmount = Math.max(totalAmount - Number(invoice.paidAmount), 0);
        const row = await tx.creditNote.create({ data: { hotelId: actor.hotelId, invoiceId: invoice.id, creditNoteNumber, amount, reason, issuedBy: actor.name } });
        await tx.invoice.update({ where: { id: invoice.id }, data: { totalAmount, balanceAmount, status: balanceAmount === 0 ? "PAID" : Number(invoice.paidAmount) > 0 ? "PARTIAL" : "UNPAID" } });
        if (invoice.bookingId) await tx.booking.update({ where: { id: invoice.bookingId }, data: { totalAmount, paymentStatus: balanceAmount === 0 ? "PAID" : Number(invoice.paidAmount) > 0 ? "PARTIAL" : "UNPAID" } });
        await tx.document.create({ data: { hotelId: actor.hotelId, title: `Credit note ${creditNoteNumber}`, type: "CREDIT_NOTE", linkedRef: invoice.invoiceNumber } });
        await audit(tx, actor, "CREATE_CREDIT_NOTE", "CreditNote", row.id, `${creditNoteNumber} · ${invoice.currency} ${amount.toFixed(2)}`);
        return row;
      }, { isolationLevel: "Serializable" });
      return { ok: true, message: `${note.creditNoteNumber} issued.` };
    }
    case "openCashierShift": {
      const openingFloat = number(payload, "openingFloat");
      if (openingFloat < 0) return { ok: false, message: "Opening float cannot be negative." };
      const existing = await db.cashierShift.findFirst({ where: { hotelId: actor.hotelId, openedBy: actor.id, status: "OPEN" } });
      if (existing) return { ok: false, message: "You already have an open cashier shift." };
      await db.$transaction(async (tx) => {
        const shift = await tx.cashierShift.create({ data: { hotelId: actor.hotelId, openedBy: actor.id, openingFloat, expectedCash: openingFloat, notes: text(payload, "notes") || null } });
        await tx.cashMovement.create({ data: { hotelId: actor.hotelId, shiftId: shift.id, type: "OPENING_FLOAT", amount: openingFloat, createdBy: actor.name } });
        await audit(tx, actor, "OPEN_CASHIER_SHIFT", "CashierShift", shift.id, `${openingFloat.toFixed(2)} opening float`);
      });
      return { ok: true, message: "Cashier shift opened." };
    }
    case "recordCashMovement": {
      const shift = await db.cashierShift.findFirst({ where: { id: text(payload, "shiftId"), hotelId: actor.hotelId, status: "OPEN" } });
      const movementType = text(payload, "type") as "CASH_IN" | "CASH_OUT" | "SAFE_DROP";
      const amount = number(payload, "amount");
      if (!shift || !["CASH_IN", "CASH_OUT", "SAFE_DROP"].includes(movementType) || amount <= 0) return { ok: false, message: "Choose an open shift, movement type, and positive amount." };
      const delta = movementType === "CASH_IN" ? amount : -amount;
      await db.$transaction(async (tx) => {
        await tx.cashMovement.create({ data: { hotelId: actor.hotelId, shiftId: shift.id, type: movementType, amount, reference: text(payload, "reference") || null, note: text(payload, "note") || null, createdBy: actor.name } });
        await tx.cashierShift.update({ where: { id: shift.id }, data: { expectedCash: { increment: delta } } });
        await audit(tx, actor, "CASH_MOVEMENT", "CashierShift", shift.id, `${movementType} ${amount.toFixed(2)}`);
      });
      return { ok: true, message: "Cash movement recorded." };
    }
    case "closeCashierShift": {
      const shift = await db.cashierShift.findFirst({ where: { id: text(payload, "shiftId"), hotelId: actor.hotelId, status: "OPEN" } });
      const closingCash = number(payload, "closingCash");
      if (!shift || closingCash < 0) return { ok: false, message: "Open shift and closing count are required." };
      const cashPayments = await db.payment.aggregate({ where: { hotelId: actor.hotelId, cashierShiftId: shift.id, method: "CASH", status: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amount: true, amountRefunded: true } });
      const expectedCash = Number(shift.expectedCash) + Number(cashPayments._sum.amount ?? 0) - Number(cashPayments._sum.amountRefunded ?? 0);
      const variance = closingCash - expectedCash;
      await db.$transaction(async (tx) => {
        await tx.cashMovement.create({ data: { hotelId: actor.hotelId, shiftId: shift.id, type: "CLOSING_COUNT", amount: closingCash, note: text(payload, "notes") || null, createdBy: actor.name } });
        await tx.cashierShift.update({ where: { id: shift.id }, data: { status: "CLOSED", closedBy: actor.id, closingCash, expectedCash, variance, closedAt: new Date() } });
        await audit(tx, actor, "CLOSE_CASHIER_SHIFT", "CashierShift", shift.id, `Variance ${variance.toFixed(2)}`);
      });
      return { ok: true, message: `Shift closed with ${variance === 0 ? "no variance" : `${variance.toFixed(2)} variance`}.` };
    }
    case "reconcilePayments": {
      const method = text(payload, "method") as "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTA_VCC";
      const periodStart = new Date(text(payload, "periodStart"));
      const periodEnd = new Date(text(payload, "periodEnd"));
      const actualAmount = number(payload, "actualAmount");
      if (!method || Number.isNaN(periodStart.valueOf()) || Number.isNaN(periodEnd.valueOf()) || periodEnd <= periodStart || actualAmount < 0) return { ok: false, message: "Valid method, period, and actual settlement amount are required." };
      const totals = await db.payment.aggregate({ where: { hotelId: actor.hotelId, method, processedAt: { gte: periodStart, lte: periodEnd }, status: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amount: true, amountRefunded: true } });
      const expectedAmount = Number(totals._sum.amount ?? 0) - Number(totals._sum.amountRefunded ?? 0);
      const variance = actualAmount - expectedAmount;
      const run = await db.reconciliationRun.create({ data: { hotelId: actor.hotelId, method, provider: text(payload, "provider") || "MANUAL", periodStart, periodEnd, expectedAmount, actualAmount, variance, status: Math.abs(variance) < 0.01 ? "MATCHED" : "VARIANCE", reference: text(payload, "reference") || null, completedBy: actor.name } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "RECONCILE_PAYMENTS", entityType: "ReconciliationRun", entityId: run.id, target: `${method} variance ${variance.toFixed(2)}` } });
      return { ok: true, message: `Reconciliation ${run.status.toLowerCase()} with ${variance.toFixed(2)} variance.` };
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
    case "createDocumentTemplate": {
      if (!text(payload, "name") || !text(payload, "content")) return { ok: false, message: "Template name and content are required." };
      const template = await db.documentTemplate.upsert({ where: { hotelId_name: { hotelId: actor.hotelId, name: text(payload, "name") } }, create: { hotelId: actor.hotelId, name: text(payload, "name"), type: text(payload, "type") as "INVOICE" | "CREDIT_NOTE" | "POLICY" | "GUEST_FORM" | "ROOM_CARD_LOG" | "AUDIT" | "HANDOVER" | "RECEIPT" | "BLUEPRINT" | "OTHER", subject: text(payload, "subject") || null, content: text(payload, "content"), createdBy: actor.name }, update: { type: text(payload, "type") as "INVOICE" | "CREDIT_NOTE" | "POLICY" | "GUEST_FORM" | "ROOM_CARD_LOG" | "AUDIT" | "HANDOVER" | "RECEIPT" | "BLUEPRINT" | "OTHER", subject: text(payload, "subject") || null, content: text(payload, "content"), active: true } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "UPSERT_DOCUMENT_TEMPLATE", entityType: "DocumentTemplate", entityId: template.id, target: template.name } });
      return { ok: true, message: "Document template saved." };
    }
    case "sendCommunication": {
      const channel = text(payload, "channel") as "EMAIL" | "SMS" | "WHATSAPP";
      const recipient = text(payload, "recipient");
      const body = text(payload, "body");
      if (!["EMAIL", "SMS", "WHATSAPP"].includes(channel) || !recipient || !body) return { ok: false, message: "Channel, recipient, and message are required." };
      if (channel === "EMAIL" && !/^\S+@\S+\.\S+$/.test(recipient)) return { ok: false, message: "Enter a valid recipient email." };
      const apiKey = channel === "EMAIL" ? process.env.RESEND_API_KEY : undefined;
      const communication = await db.communication.create({ data: { hotelId: actor.hotelId, channel, recipient, subject: text(payload, "subject") || null, body, status: apiKey ? "QUEUED" : "DRAFT", provider: apiKey ? "RESEND" : null, linkedRef: text(payload, "linkedRef") || null, createdBy: actor.name } });
      if (!apiKey) return { ok: true, message: `${channel.replaceAll("_", " ")} draft saved. Configure its provider to send.` };
      try {
        const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": communication.id }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL ?? "StayPilot <onboarding@resend.dev>", to: [recipient], subject: text(payload, "subject") || statefulSubject(text(payload, "linkedRef")), text: body }) });
        const responseBody = await response.json() as { id?: string; message?: string };
        if (!response.ok || !responseBody.id) throw new Error(responseBody.message || `Provider returned ${response.status}`);
        await db.communication.update({ where: { id: communication.id }, data: { status: "SENT", providerMessageId: responseBody.id, sentAt: new Date() } });
        await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "SEND_COMMUNICATION", entityType: "Communication", entityId: communication.id, target: `${channel} · ${recipient}` } });
        return { ok: true, message: "Email accepted by the delivery provider." };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message.slice(0, 500) : "Provider delivery failed";
        await db.communication.update({ where: { id: communication.id }, data: { status: "FAILED", error: errorMessage } });
        return { ok: false, message: "Delivery failed and was recorded for retry." };
      }
    }
    case "createOperationalTask": {
      const title = text(payload, "title");
      const department = text(payload, "department");
      if (!title || !department) return { ok: false, message: "Task title and department are required." };
      const dueAt = text(payload, "dueAt") ? new Date(text(payload, "dueAt")) : null;
      if (dueAt && Number.isNaN(dueAt.valueOf())) return { ok: false, message: "Task due date is invalid." };
      const task = await db.operationalTask.create({ data: { hotelId: actor.hotelId, department, title, description: text(payload, "description"), priority: text(payload, "priority") as "LOW" | "MEDIUM" | "HIGH" | "URGENT", assignee: text(payload, "assignee") || "Unassigned", dueAt, sourceType: text(payload, "sourceType") || null, sourceId: text(payload, "sourceId") || null, createdBy: actor.name } });
      await db.auditLog.create({ data: { hotelId: actor.hotelId, userId: actor.id, actorName: actor.name, action: "CREATE_OPERATIONAL_TASK", entityType: "OperationalTask", entityId: task.id, target: `${department} · ${title}` } });
      return { ok: true, message: "Department task created." };
    }
    case "updateOperationalTask": {
      const task = await db.operationalTask.findFirst({ where: { id: text(payload, "taskId"), hotelId: actor.hotelId } });
      const status = text(payload, "status") as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
      if (!task || !["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(status)) return { ok: false, message: "Task or status is invalid." };
      await db.$transaction(async (tx) => {
        await tx.operationalTask.update({ where: { id: task.id }, data: { status, assignee: text(payload, "assignee") || task.assignee, completedAt: status === "COMPLETED" ? new Date() : null } });
        await audit(tx, actor, "UPDATE_OPERATIONAL_TASK", "OperationalTask", task.id, task.title, { status: task.status }, { status });
      });
      return { ok: true, message: "Department task updated." };
    }
    case "createIncident": {
      const room = text(payload, "roomNumber") ? await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "roomNumber") } }) : null;
      if (!text(payload, "title") || !text(payload, "description")) return { ok: false, message: "Incident title and factual description are required." };
      const incident = await db.$transaction(async (tx) => {
        const row = await tx.incident.create({ data: { hotelId: actor.hotelId, roomId: room?.id, type: text(payload, "type") || "GENERAL", title: text(payload, "title"), description: text(payload, "description"), severity: text(payload, "severity") as "LOW" | "MEDIUM" | "HIGH" | "URGENT", reportedBy: actor.name, assignedTo: text(payload, "assignedTo") || null, occurredAt: text(payload, "occurredAt") ? new Date(text(payload, "occurredAt")) : new Date() } });
        await tx.notification.create({ data: { hotelId: actor.hotelId, title: `Incident: ${row.title}`, message: `${row.type}${room ? ` · Room ${room.roomNumber}` : ""}`, severity: row.severity, audience: "MANAGER" } });
        await audit(tx, actor, "CREATE_INCIDENT", "Incident", row.id, row.title);
        return row;
      });
      return { ok: true, message: `Incident ${incident.id.slice(-6).toUpperCase()} logged.` };
    }
    case "updateIncident": {
      const incident = await db.incident.findFirst({ where: { id: text(payload, "incidentId"), hotelId: actor.hotelId } });
      const status = text(payload, "status") as "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
      if (!incident || !["OPEN", "INVESTIGATING", "RESOLVED", "CLOSED"].includes(status)) return { ok: false, message: "Incident or status is invalid." };
      if (["RESOLVED", "CLOSED"].includes(status) && !text(payload, "resolution")) return { ok: false, message: "Resolution notes are required to close an incident." };
      await db.$transaction(async (tx) => {
        await tx.incident.update({ where: { id: incident.id }, data: { status, assignedTo: text(payload, "assignedTo") || incident.assignedTo, resolution: text(payload, "resolution") || incident.resolution, resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null } });
        await audit(tx, actor, "UPDATE_INCIDENT", "Incident", incident.id, incident.title, { status: incident.status }, { status });
      });
      return { ok: true, message: "Incident updated." };
    }
    case "createLostFoundItem": {
      const room = text(payload, "roomNumber") ? await db.room.findFirst({ where: { hotelId: actor.hotelId, roomNumber: text(payload, "roomNumber") } }) : null;
      if (!text(payload, "description") || !text(payload, "foundLocation")) return { ok: false, message: "Item description and found location are required." };
      const item = await db.$transaction(async (tx) => {
        const itemCode = await nextDocumentCode(tx, actor.hotelId, "LOST_FOUND", "LNF");
        const row = await tx.lostFoundItem.create({ data: { hotelId: actor.hotelId, roomId: room?.id, itemCode, category: text(payload, "category") || "OTHER", description: text(payload, "description"), foundLocation: text(payload, "foundLocation"), storageLocation: text(payload, "storageLocation") || null, status: text(payload, "storageLocation") ? "STORED" : "REPORTED", guestName: text(payload, "guestName") || null, guestContact: text(payload, "guestContact") || null, foundAt: new Date(), recordedBy: actor.name } });
        await audit(tx, actor, "CREATE_LOST_FOUND", "LostFoundItem", row.id, itemCode);
        return row;
      });
      return { ok: true, message: `${item.itemCode} registered.` };
    }
    case "updateLostFoundItem": {
      const item = await db.lostFoundItem.findFirst({ where: { id: text(payload, "itemId"), hotelId: actor.hotelId } });
      const status = text(payload, "status") as "REPORTED" | "STORED" | "CLAIMED" | "RETURNED" | "DISPOSED";
      if (!item || !["REPORTED", "STORED", "CLAIMED", "RETURNED", "DISPOSED"].includes(status)) return { ok: false, message: "Custody item or status is invalid." };
      await db.$transaction(async (tx) => {
        await tx.lostFoundItem.update({ where: { id: item.id }, data: { status, storageLocation: text(payload, "storageLocation") || item.storageLocation, guestName: text(payload, "guestName") || item.guestName, guestContact: text(payload, "guestContact") || item.guestContact, claimedAt: ["CLAIMED", "RETURNED"].includes(status) ? new Date() : item.claimedAt } });
        await audit(tx, actor, "UPDATE_LOST_FOUND", "LostFoundItem", item.id, item.itemCode, { status: item.status }, { status });
      });
      return { ok: true, message: `${item.itemCode} custody updated.` };
    }
    case "createPurchaseOrder": {
      const vendor = await db.vendor.findFirst({ where: { id: text(payload, "vendorId"), hotelId: actor.hotelId, active: true } });
      const lines = Array.isArray(payload.lines) ? payload.lines.filter((line): line is { inventoryItemId: string; quantity: number; unitCost: number } => Boolean(line && typeof line === "object" && "inventoryItemId" in line && "quantity" in line && "unitCost" in line)).map((line) => ({ inventoryItemId: String(line.inventoryItemId), quantity: Number(line.quantity), unitCost: Number(line.unitCost) })).filter((line) => line.inventoryItemId && Number.isInteger(line.quantity) && line.quantity > 0 && line.unitCost >= 0) : [];
      if (!vendor || lines.length === 0) return { ok: false, message: "Active vendor and at least one valid order line are required." };
      const itemCount = await db.inventoryItem.count({ where: { hotelId: actor.hotelId, id: { in: lines.map((line) => line.inventoryItemId) } } });
      if (itemCount !== new Set(lines.map((line) => line.inventoryItemId)).size) return { ok: false, message: "One or more stock items are invalid." };
      const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
      const order = await db.$transaction(async (tx) => {
        const poNumber = await nextDocumentCode(tx, actor.hotelId, "PURCHASE_ORDER", "PO");
        const row = await tx.purchaseOrder.create({ data: { hotelId: actor.hotelId, vendorId: vendor.id, poNumber, status: "SUBMITTED", totalAmount, notes: text(payload, "notes") || null, requestedBy: actor.name, submittedAt: new Date(), lines: { create: lines.map((line) => ({ inventoryItemId: line.inventoryItemId, quantityOrdered: line.quantity, unitCost: line.unitCost })) } } });
        await audit(tx, actor, "CREATE_PURCHASE_ORDER", "PurchaseOrder", row.id, `${poNumber} · ${totalAmount.toFixed(2)}`);
        return row;
      });
      return { ok: true, message: `${order.poNumber} submitted for approval.` };
    }
    case "updatePurchaseOrderStatus": {
      const order = await db.purchaseOrder.findFirst({ where: { id: text(payload, "purchaseOrderId"), hotelId: actor.hotelId } });
      const status = text(payload, "status") as "SUBMITTED" | "APPROVED" | "ORDERED" | "CANCELLED";
      if (!order) return { ok: false, message: "Purchase order not found." };
      const transitions: Record<string, string[]> = { DRAFT: ["SUBMITTED", "CANCELLED"], SUBMITTED: ["APPROVED", "CANCELLED"], APPROVED: ["ORDERED", "CANCELLED"], ORDERED: ["CANCELLED"] };
      if (!transitions[order.status]?.includes(status)) return { ok: false, message: `${order.status} orders cannot move to ${status}.` };
      if (status === "APPROVED" && !["HOTEL_ADMIN", "MANAGER"].includes(actor.role)) return { ok: false, message: "Manager approval is required." };
      await db.$transaction(async (tx) => {
        await tx.purchaseOrder.update({ where: { id: order.id }, data: { status, approvedBy: status === "APPROVED" ? actor.name : order.approvedBy, approvedAt: status === "APPROVED" ? new Date() : order.approvedAt, orderedAt: status === "ORDERED" ? new Date() : order.orderedAt } });
        await audit(tx, actor, "UPDATE_PURCHASE_ORDER", "PurchaseOrder", order.id, `${order.poNumber} · ${status}`);
      });
      return { ok: true, message: `${order.poNumber} moved to ${status}.` };
    }
    case "receivePurchaseOrder": {
      const order = await db.purchaseOrder.findFirst({ where: { id: text(payload, "purchaseOrderId"), hotelId: actor.hotelId, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } }, include: { lines: true } });
      const receipts = Array.isArray(payload.receipts) ? payload.receipts.filter((row): row is { lineId: string; quantity: number } => Boolean(row && typeof row === "object" && "lineId" in row && "quantity" in row)).map((row) => ({ lineId: String(row.lineId), quantity: Number(row.quantity) })).filter((row) => row.lineId && Number.isInteger(row.quantity) && row.quantity > 0) : [];
      if (!order || receipts.length === 0) return { ok: false, message: "Ordered purchase order and received quantities are required." };
      try {
        await db.$transaction(async (tx) => {
          for (const receipt of receipts) {
            const line = order.lines.find((candidate) => candidate.id === receipt.lineId);
            if (!line || line.quantityReceived + receipt.quantity > line.quantityOrdered) throw new Error("RECEIPT_EXCEEDS_ORDER");
            const item = await tx.inventoryItem.findFirstOrThrow({ where: { id: line.inventoryItemId, hotelId: actor.hotelId } });
            const resultingStock = item.stockOnHand + receipt.quantity;
            await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { quantityReceived: { increment: receipt.quantity } } });
            await tx.inventoryItem.update({ where: { id: item.id }, data: { stockOnHand: resultingStock } });
            await tx.inventoryMovement.create({ data: { hotelId: actor.hotelId, inventoryItemId: item.id, type: "RECEIPT", quantityDelta: receipt.quantity, resultingStock, reference: order.poNumber, recordedBy: actor.name } });
          }
          const updated = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: order.id } });
          const complete = updated.every((line) => line.quantityReceived >= line.quantityOrdered);
          await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedAt: complete ? new Date() : null } });
          await audit(tx, actor, "RECEIVE_PURCHASE_ORDER", "PurchaseOrder", order.id, order.poNumber);
        }, { isolationLevel: "Serializable" });
      } catch (error) {
        if (error instanceof Error && error.message === "RECEIPT_EXCEEDS_ORDER") return { ok: false, message: "Received quantity exceeds the outstanding order." };
        throw error;
      }
      return { ok: true, message: `${order.poNumber} receipt posted to stock.` };
    }
    case "addInventoryItem": {
      const vendor = text(payload, "vendorName") ? await db.vendor.findFirst({ where: { hotelId: actor.hotelId, name: text(payload, "vendorName") } }) : null;
      await db.inventoryItem.create({ data: { hotelId: actor.hotelId, vendorId: vendor?.id, name: text(payload, "name"), category: text(payload, "category") as "LINEN" | "AMENITY" | "MINIBAR" | "HOUSEKEEPING" | "ENGINEERING", stockOnHand: number(payload, "stockOnHand"), reorderLevel: number(payload, "reorderLevel") } });
      return { ok: true, message: "Inventory item added." };
    }
    case "adjustInventoryItem": {
      const item = await db.inventoryItem.findFirst({ where: { id: text(payload, "itemId"), hotelId: actor.hotelId } });
      if (!item) return { ok: false, message: "Inventory item not found." };
      const nextStock = Math.max(0, Math.trunc(number(payload, "nextStock")));
      await db.$transaction(async (tx) => {
        await tx.inventoryItem.update({ where: { id: item.id }, data: { stockOnHand: nextStock } });
        await tx.inventoryMovement.create({ data: { hotelId: actor.hotelId, inventoryItemId: item.id, type: "ADJUSTMENT", quantityDelta: nextStock - item.stockOnHand, resultingStock: nextStock, note: text(payload, "note") || "Manual stock count", recordedBy: actor.name } });
        await audit(tx, actor, "ADJUST_INVENTORY", "InventoryItem", item.id, item.name, { stockOnHand: item.stockOnHand }, { stockOnHand: nextStock });
      });
      return { ok: true, message: "Inventory count adjusted with movement history." };
    }
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
        await tx.communication.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.inventoryMovement.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.purchaseOrder.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.operationalTask.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.incident.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.lostFoundItem.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.webhookEvent.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.reconciliationRun.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.cashMovement.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.cashierShift.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.creditNote.deleteMany({ where: { hotelId: actor.hotelId } });
        await tx.paymentRequest.deleteMany({ where: { hotelId: actor.hotelId } });
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
