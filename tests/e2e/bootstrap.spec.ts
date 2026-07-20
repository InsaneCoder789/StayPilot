import { generate } from "otplib";
import { expect, request as apiRequest, test } from "@playwright/test";

import { getDb } from "@/lib/db";

test("fresh property presents secure owner setup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Create the owner." })).toBeVisible();
  await expect(page.getByLabel("Owner name")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create private workspace/ })).toBeVisible();
});

test("health endpoint reports database readiness", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ready", database: "connected" });
});

test("identity lifecycle enforces lockout, reset, MFA, invitations, and sessions", async ({ request }) => {
  const ownerEmail = "e2e-owner@staypilot.invalid";
  const staffEmail = "e2e-staff@staypilot.invalid";
  const db = getDb();

  await db.loginAttempt.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
  await db.staffInvitation.deleteMany({ where: { email: staffEmail } });
  await db.user.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });

  try {
    expect((await request.get("/api/auth/sessions")).status()).toBe(401);
    const bootstrap = await request.post("/api/auth/bootstrap", { data: { name: "E2E Owner", email: ownerEmail, password: "StayPilot!Owner2026" } });
    expect(bootstrap.ok()).toBe(true);

    await request.post("/api/auth/logout");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "Incorrect!Password1" } });
      expect(failed.status()).toBe(401);
    }
    const locked = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "StayPilot!Owner2026" } });
    expect(locked.status()).toBe(429);

    const recovery = await request.post("/api/auth/password/request", { data: { email: ownerEmail } });
    const recoveryBody = await recovery.json() as { resetUrl: string };
    const resetToken = new URL(recoveryBody.resetUrl).searchParams.get("reset");
    expect(resetToken).toBeTruthy();
    const reset = await request.post("/api/auth/password/reset", { data: { token: resetToken, password: "StayPilot!Renewed2026" } });
    expect(reset.ok()).toBe(true);

    const login = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "StayPilot!Renewed2026" } });
    expect(login.ok()).toBe(true);
    const mfaSetup = await request.post("/api/auth/mfa", { data: { action: "setup" } });
    const mfaBody = await mfaSetup.json() as { secret: string };
    const otp = await generate({ secret: mfaBody.secret });
    const mfaEnable = await request.post("/api/auth/mfa", { data: { action: "enable", otp } });
    expect(mfaEnable.ok()).toBe(true);

    const invitation = await request.post("/api/auth/invitations", { data: { name: "E2E Reception", email: staffEmail, role: "RECEPTIONIST" } });
    const invitationBody = await invitation.json() as { invitationUrl: string };
    const invitationToken = new URL(invitationBody.invitationUrl).searchParams.get("invite");
    const staffContext = await apiRequest.newContext({ baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100" });
    const accepted = await staffContext.post("/api/auth/invitations/accept", { data: { token: invitationToken, password: "StayPilot!Staff2026" } });
    expect(accepted.ok()).toBe(true);
    const staffSessions = await staffContext.get("/api/auth/sessions");
    await expect(staffSessions.json()).resolves.toMatchObject({ sessions: [{ deviceName: "Desktop browser" }] });
    await staffContext.dispose();
  } finally {
    await db.loginAttempt.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
    await db.staffInvitation.deleteMany({ where: { email: staffEmail } });
    await db.user.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
    await db.$disconnect();
  }
});

test("reservation lifecycle prevents conflicts and coordinates room movement", async ({ request }) => {
  const email = "e2e-pms@staypilot.invalid";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E PMS", email, password: "StayPilot!Pms2026" } })).ok()).toBe(true);
    const initial = await request.get("/api/hotel/state");
    const initialBody = await initial.json() as { state: { rooms: Array<{ roomNumber: string; roomType: string; status: string }> } };
    const roomType = initialBody.state.rooms[0].roomType;
    const matchingRooms = initialBody.state.rooms.filter((room) => room.roomType === roomType && room.status === "AVAILABLE").slice(0, 3);
    expect(matchingRooms).toHaveLength(3);

    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; state?: { bookings: Array<{ id: string; guestName: string; status: string; roomNumber?: string }>; housekeeping: Array<{ roomNumber: string }> } }>;
    };
    const bookingPayload = (guestName: string, checkIn: string, checkOut: string) => ({ guestName, phone: "000", email: `${guestName.toLowerCase().replaceAll(" ", "-")}@staypilot.invalid`, roomType, checkIn, checkOut, source: "DIRECT", specialRequests: "", totalAmount: 500, depositRequired: 100 });

    let result = await command("createBooking", bookingPayload("Conflict One", "2027-08-01", "2027-08-03"));
    const firstId = result.state!.bookings.find((booking) => booking.guestName === "Conflict One")!.id;
    result = await command("createBooking", bookingPayload("Conflict Two", "2027-08-02", "2027-08-04"));
    const secondId = result.state!.bookings.find((booking) => booking.guestName === "Conflict Two")!.id;
    result = await command("createBooking", bookingPayload("Turnover Guest", "2027-08-03", "2027-08-06"));
    const turnoverId = result.state!.bookings.find((booking) => booking.guestName === "Turnover Guest")!.id;

    expect((await command("assignBookingRoom", { bookingId: firstId, roomNumber: matchingRooms[0].roomNumber })).ok).toBe(true);
    expect((await command("assignBookingRoom", { bookingId: secondId, roomNumber: matchingRooms[0].roomNumber })).ok).toBe(false);
    const protectedRoom = await db.room.findFirstOrThrow({ where: { roomNumber: matchingRooms[0].roomNumber } });
    await expect(db.booking.update({ where: { id: secondId }, data: { roomId: protectedRoom.id } })).rejects.toThrow();
    expect((await command("assignBookingRoom", { bookingId: turnoverId, roomNumber: matchingRooms[0].roomNumber })).ok).toBe(true);
    expect((await command("assignBookingRoom", { bookingId: secondId, roomNumber: matchingRooms[2].roomNumber })).ok).toBe(true);

    expect((await command("checkInBooking", { bookingId: firstId, roomNumber: matchingRooms[0].roomNumber })).ok).toBe(true);
    expect((await command("extendStay", { bookingId: firstId, checkOut: "2027-08-04" })).ok).toBe(false);
    expect((await command("moveRoom", { bookingId: firstId, roomNumber: matchingRooms[1].roomNumber })).ok).toBe(true);
    result = await command("checkOutBooking", { bookingId: firstId });
    expect(result.ok).toBe(true);
    expect(result.state!.housekeeping.some((task) => task.roomNumber === matchingRooms[0].roomNumber)).toBe(true);
    expect(result.state!.housekeeping.some((task) => task.roomNumber === matchingRooms[1].roomNumber)).toBe(true);

    expect((await command("cancelBooking", { bookingId: secondId, reason: "Guest changed plans" })).ok).toBe(true);
    expect((await command("markBookingNoShow", { bookingId: turnoverId })).ok).toBe(true);
    expect((await command("resetHotelData")).ok).toBe(true);
  } finally {
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});

test("finance lifecycle controls capture, refunds, credits, cashiering, and reconciliation", async ({ request }) => {
  const email = "e2e-finance@staypilot.invalid";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Finance", email, password: "StayPilot!Finance2026" } })).ok()).toBe(true);
    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; state?: {
        invoices: Array<{ id: string; invoiceNumber: string; paidAmount: number; balanceAmount: number }>;
        payments: Array<{ id: string; status: string; amountRefunded: number }>;
        cashierShifts: Array<{ id: string; status: string; variance?: number }>;
        creditNotes: Array<{ creditNoteNumber: string; amount: number }>;
        reconciliations: Array<{ status: string; variance: number }>;
      } }>;
    };

    let result = await command("createInvoice", { guestName: "Ledger Guest", bookingCode: "DIRECT-FOLIO", lineItems: [{ label: "Conference room", amount: 100 }] });
    const invoice = result.state!.invoices.find((row) => row.invoiceNumber.startsWith("INV-"))!;
    expect((await command("openCashierShift", { openingFloat: 100 })).ok).toBe(true);

    result = await command("recordPayment", { invoiceId: invoice.id, amount: 80, paymentMethod: "CASH", reference: "E2E-CASH-001" });
    expect(result.ok).toBe(true);
    const payment = result.state!.payments[0];
    expect(result.state!.invoices.find((row) => row.id === invoice.id)).toMatchObject({ paidAmount: 80, balanceAmount: 20 });

    result = await command("refundPayment", { paymentId: payment.id, amount: 20 });
    expect(result.state!.payments[0]).toMatchObject({ status: "PARTIALLY_REFUNDED", amountRefunded: 20 });
    expect(result.state!.invoices.find((row) => row.id === invoice.id)).toMatchObject({ paidAmount: 60, balanceAmount: 40 });

    result = await command("createCreditNote", { invoiceId: invoice.id, amount: 10, reason: "Approved service recovery" });
    expect(result.state!.creditNotes[0]).toMatchObject({ amount: 10 });
    expect(result.state!.invoices.find((row) => row.id === invoice.id)).toMatchObject({ paidAmount: 60, balanceAmount: 30 });

    const openShift = result.state!.cashierShifts.find((shift) => shift.status === "OPEN")!;
    result = await command("closeCashierShift", { shiftId: openShift.id, closingCash: 160 });
    expect(result.state!.cashierShifts[0]).toMatchObject({ status: "CLOSED", variance: 0 });

    const end = new Date();
    const start = new Date(end.getTime() - 60_000);
    result = await command("reconcilePayments", { method: "CASH", provider: "MANUAL", periodStart: start.toISOString(), periodEnd: end.toISOString(), actualAmount: 60 });
    expect(result.state!.reconciliations[0]).toMatchObject({ status: "MATCHED", variance: 0 });

    const checkout = await request.post("/api/payments/checkout", { data: { invoiceId: invoice.id, amount: 10 } });
    expect(checkout.status()).toBe(503);
    await expect(checkout.json()).resolves.toMatchObject({ ok: false, message: "Stripe is not configured for this deployment." });
    expect((await command("resetHotelData")).ok).toBe(true);
  } finally {
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
