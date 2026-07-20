import { createHmac } from "node:crypto";
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

test("operations lifecycle controls tasks, incidents, custody, procurement, and stock", async ({ request }) => {
  const email = "e2e-operations@staypilot.invalid";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });
  let inventoryId: string | undefined;
  let originalStock = 0;

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Operations", email, password: "StayPilot!Operations2026" } })).ok()).toBe(true);
    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; state?: {
        operationalTasks: Array<{ id: string; status: string }>;
        incidents: Array<{ id: string; status: string }>;
        lostFound: Array<{ id: string; itemCode: string; status: string }>;
        vendors: Array<{ id: string }>;
        inventory: Array<{ id: string; stockOnHand: number }>;
        purchaseOrders: Array<{ id: string; status: string; lines: Array<{ id: string; quantityOrdered: number; quantityReceived: number }> }>;
        inventoryMovements: Array<{ type: string; quantityDelta: number }>;
      } }>;
    };

    let result = await command("createOperationalTask", { department: "SECURITY", title: "Inspect loading dock", description: "Confirm seal and CCTV coverage", priority: "HIGH" });
    const taskId = result.state!.operationalTasks[0].id;
    result = await command("updateOperationalTask", { taskId, status: "COMPLETED" });
    expect(result.state!.operationalTasks[0].status).toBe("COMPLETED");

    result = await command("createIncident", { type: "SAFETY", title: "Wet loading bay", description: "Area isolated and warning signs installed", severity: "HIGH" });
    const incidentId = result.state!.incidents[0].id;
    result = await command("updateIncident", { incidentId, status: "RESOLVED", resolution: "Drain cleared and floor dried" });
    expect(result.state!.incidents[0].status).toBe("RESOLVED");

    result = await command("createLostFoundItem", { category: "PERSONAL", description: "Black travel wallet", foundLocation: "Lobby sofa", storageLocation: "Safe A-03" });
    const custody = result.state!.lostFound[0];
    expect(custody.itemCode).toMatch(/^LNF-/);
    result = await command("updateLostFoundItem", { itemId: custody.id, status: "RETURNED" });
    expect(result.state!.lostFound[0].status).toBe("RETURNED");

    const vendorId = result.state!.vendors[0].id;
    inventoryId = result.state!.inventory[0].id;
    originalStock = result.state!.inventory[0].stockOnHand;
    result = await command("createPurchaseOrder", { vendorId, lines: [{ inventoryItemId: inventoryId, quantity: 5, unitCost: 3.5 }], notes: "E2E supply control" });
    const purchaseOrderId = result.state!.purchaseOrders[0].id;
    expect((await command("updatePurchaseOrderStatus", { purchaseOrderId, status: "APPROVED" })).ok).toBe(true);
    expect((await command("updatePurchaseOrderStatus", { purchaseOrderId, status: "ORDERED" })).ok).toBe(true);
    result = await command("receivePurchaseOrder", { purchaseOrderId, receipts: [{ lineId: result.state!.purchaseOrders[0].lines[0].id, quantity: 5 }] });
    expect(result.state!.purchaseOrders[0].status).toBe("RECEIVED");
    expect(result.state!.inventory.find((item) => item.id === inventoryId)?.stockOnHand).toBe(originalStock + 5);
    expect(result.state!.inventoryMovements[0]).toMatchObject({ type: "RECEIPT", quantityDelta: 5 });
  } finally {
    if (inventoryId) await db.inventoryItem.update({ where: { id: inventoryId }, data: { stockOnHand: originalStock } });
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});

test("document lifecycle persists originals, generates PDFs, templates messages, and tracks delivery", async ({ request }) => {
  const email = "e2e-documents@staypilot.invalid";
  const templateName = "E2E Arrival Letter";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.documentTemplate.deleteMany({ where: { name: templateName } });
  await db.user.deleteMany({ where: { email } });

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Documents", email, password: "StayPilot!Documents2026" } })).ok()).toBe(true);
    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; state?: {
        documents: Array<{ id: string; title: string; downloadable: boolean; sizeBytes?: number }>;
        documentTemplates: Array<{ name: string; content: string }>;
        communications: Array<{ recipient: string; status: string }>;
      } }>;
    };

    let result = await command("createInvoice", { guestName: "Document Guest", bookingCode: "DOC-FOLIO", lineItems: [{ label: "Room charge", amount: 125 }] });
    const generated = result.state!.documents.find((document) => document.title.startsWith("Invoice "))!;
    const generatedDownload = await request.get(`/api/documents/${generated.id}/download`);
    expect(generatedDownload.ok()).toBe(true);
    expect(generatedDownload.headers()["content-type"]).toBe("application/pdf");
    expect((await generatedDownload.body()).subarray(0, 4).toString()).toBe("%PDF");

    const originalBytes = Buffer.from("StayPilot controlled document\nLine two\n", "utf8");
    const upload = await request.post("/api/documents", { multipart: { title: "E2E Control Note", type: "OTHER", linkedRef: "E2E-DOC-001", file: { name: "control-note.txt", mimeType: "text/plain", buffer: originalBytes } } });
    expect(upload.ok()).toBe(true);
    const uploadBody = await upload.json() as { documentId: string };
    const originalDownload = await request.get(`/api/documents/${uploadBody.documentId}/download`);
    expect(originalDownload.ok()).toBe(true);
    expect(await originalDownload.body()).toEqual(originalBytes);

    result = await command("createDocumentTemplate", { name: templateName, type: "GUEST_FORM", subject: "Your arrival", content: "Welcome to the hotel. Your reservation is confirmed." });
    expect(result.state!.documentTemplates[0]).toMatchObject({ name: templateName });
    result = await command("sendCommunication", { channel: "EMAIL", recipient: "guest@staypilot.invalid", subject: "Your arrival", body: "Welcome to the hotel.", linkedRef: "DOC-FOLIO" });
    expect(result.ok).toBe(true);
    expect(result.state!.communications[0]).toMatchObject({ recipient: "guest@staypilot.invalid", status: "DRAFT" });
  } finally {
    const reset = await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    expect(reset.ok()).toBe(true);
    await db.documentTemplate.deleteMany({ where: { name: templateName } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});

test("integration bridge authenticates NFC hardware and idempotent OTA, POS, and accounting flows", async ({ request }) => {
  const email = "e2e-integrations@staypilot.invalid";
  const deviceCode = "E2E-NFC-001";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.nfcDevice.deleteMany({ where: { deviceCode } });
  await db.user.deleteMany({ where: { email } });
  const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("hex");

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Integrations", email, password: "StayPilot!Integrations2026" } })).ok()).toBe(true);
    const malformed = "{not-json";
    expect((await request.post("/api/integrations/ota/reservations", { headers: { "Content-Type": "application/json", "x-staypilot-signature": sign(malformed, "e2e-ota-shared-secret") }, data: Buffer.from(malformed) })).status()).toBe(400);
    expect((await request.post("/api/integrations/pos/folio", { headers: { "Content-Type": "application/json", "x-staypilot-signature": sign(malformed, "e2e-pos-shared-secret") }, data: Buffer.from(malformed) })).status()).toBe(400);
    const hotel = await db.hotel.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; secret?: string; state?: {
        rooms: Array<{ roomNumber: string; roomType: string }>;
        roomCards: Array<{ id: string; status: string }>;
        nfcEvents: Array<{ event: string }>;
        bookings: Array<{ source: string }>;
        invoices: Array<{ invoiceNumber: string; totalAmount: number; balanceAmount: number }>;
        integrationSyncs: Array<{ provider: string; operation: string; status: string }>;
      } }>;
    };

    let result = await command("registerNfcDevice", { name: "E2E Front Desk Bridge", deviceCode, location: "E2E encoder" });
    expect(result.secret).toBeTruthy();
    const token = result.secret!;
    const room = result.state!.rooms[0];
    result = await command("issueRoomCard", { roomNumber: room.roomNumber, guestName: "Bridge Guest", accessType: "NFC" });
    expect(result.state!.roomCards[0].status).toBe("READY");
    const cardId = result.state!.roomCards[0].id;

    const poll = await request.post("/api/device/nfc/poll", { headers: { Authorization: `Bearer ${token}` }, data: { firmware: "e2e-1.0" } });
    const polled = await poll.json() as { command: { id: string; type: string; payload: { roomNumber: string; credential: string } } };
    expect(polled.command.type).toBe("ENCODE_CREDENTIAL");
    expect(polled.command.payload).toMatchObject({ roomNumber: room.roomNumber });
    expect(polled.command.payload.credential).toBeTruthy();
    expect((await request.post("/api/device/nfc/result", { headers: { Authorization: `Bearer ${token}` }, data: { commandId: polled.command.id, success: true } })).ok()).toBe(true);
    expect((await request.post("/api/device/nfc/events", { headers: { Authorization: `Bearer ${token}` }, data: { events: [{ cardId, event: "ACCESS_GRANTED", location: `Room ${room.roomNumber} door` }] } })).ok()).toBe(true);
    result = await command("markNotificationRead", { notificationId: "missing" });
    expect(result.state!.roomCards[0].status).toBe("ACTIVE");
    expect(result.state!.nfcEvents.some((event) => event.event === "ACCESS_GRANTED")).toBe(true);

    const otaPayload = JSON.stringify({ hotelId: hotel.id, externalReservationId: "OTA-E2E-1001", event: "CREATED", guest: { firstName: "Channel", lastName: "Guest", email: "channel@staypilot.invalid", phone: "000" }, roomType: room.roomType, checkIn: "2027-09-10T12:00:00.000Z", checkOut: "2027-09-12T12:00:00.000Z", totalAmount: 400, specialRequests: "High floor" });
    const otaHeaders = { "Content-Type": "application/json", "x-staypilot-signature": sign(otaPayload, "e2e-ota-shared-secret"), "x-staypilot-provider": "E2E_OTA", "x-staypilot-event-id": "evt-ota-e2e-1" };
    expect((await request.post("/api/integrations/ota/reservations", { headers: otaHeaders, data: otaPayload })).ok()).toBe(true);
    const duplicate = await request.post("/api/integrations/ota/reservations", { headers: otaHeaders, data: otaPayload });
    await expect(duplicate.json()).resolves.toMatchObject({ ok: true, duplicate: true });

    const stateAfterOta = await request.get("/api/hotel/state");
    const otaState = (await stateAfterOta.json() as { state: { invoices: Array<{ invoiceNumber: string }> } }).state;
    const invoiceNumber = otaState.invoices[0].invoiceNumber;
    const posPayload = JSON.stringify({ hotelId: hotel.id, externalId: "POS-E2E-001", invoiceNumber, outlet: "ROOM_SERVICE", charges: [{ label: "Club sandwich", quantity: 1, amount: 35 }] });
    const posHeaders = { "Content-Type": "application/json", "x-staypilot-signature": sign(posPayload, "e2e-pos-shared-secret"), "x-staypilot-provider": "E2E_POS" };
    expect((await request.post("/api/integrations/pos/folio", { headers: posHeaders, data: posPayload })).ok()).toBe(true);
    const posDuplicate = await request.post("/api/integrations/pos/folio", { headers: posHeaders, data: posPayload });
    await expect(posDuplicate.json()).resolves.toMatchObject({ duplicate: true });

    const exportResponse = await request.get("/api/integrations/accounting/export");
    expect(exportResponse.ok()).toBe(true);
    expect(await exportResponse.text()).toContain(invoiceNumber);
  } finally {
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.nfcDevice.deleteMany({ where: { deviceCode } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});

test("reporting lifecycle calculates server metrics, exports data, and runs scheduled packs", async ({ request }) => {
  const email = "e2e-reporting@staypilot.invalid";
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Reporting", email, password: "StayPilot!Reporting2026" } })).ok()).toBe(true);
    const stateResponse = await request.get("/api/hotel/state");
    const state = (await stateResponse.json() as { state: { rooms: Array<{ roomType: string }> } }).state;
    const checkIn = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const checkOut = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);
    expect((await request.post("/api/hotel/command", { data: { action: "createBooking", payload: { guestName: "Forecast Guest", phone: "000", email: "forecast@staypilot.invalid", roomType: state.rooms[0].roomType, checkIn, checkOut, source: "DIRECT", specialRequests: "", totalAmount: 300 } } })).ok()).toBe(true);
    expect((await request.post("/api/hotel/command", { data: { action: "createOperationalTask", payload: { department: "FRONT_DESK", title: "Overdue reporting task", description: "SLA validation", priority: "HIGH", dueAt: new Date(Date.now() - 3_600_000).toISOString() } } })).ok()).toBe(true);

    const overviewResponse = await request.get("/api/reports/overview");
    expect(overviewResponse.ok()).toBe(true);
    const overview = await overviewResponse.json() as { report: { summary: { roomCount: number; openReceivables: number; pickup7Days: number; overdueTasks: number }; forecast: Array<{ occupancyPercent: number }> } };
    expect(overview.report.summary).toMatchObject({ roomCount: 101, pickup7Days: 1, overdueTasks: 1 });
    expect(overview.report.summary.openReceivables).toBeGreaterThan(0);
    expect(overview.report.forecast.some((day) => day.occupancyPercent > 0)).toBe(true);
    const forecastExport = await request.get("/api/reports/export?dataset=forecast");
    expect(forecastExport.ok()).toBe(true);
    expect(await forecastExport.text()).toContain("occupancy_percent");

    const schedule = await request.post("/api/reports/schedules", { data: { name: "E2E Management Pack", reportType: "MANAGEMENT_OVERVIEW", frequency: "DAILY", recipients: ["manager@staypilot.invalid"], nextRunAt: new Date(Date.now() - 60_000).toISOString() } });
    expect(schedule.ok()).toBe(true);
    expect((await request.get("/api/cron/reports")).status()).toBe(401);
    const cron = await request.get("/api/cron/reports", { headers: { Authorization: "Bearer e2e-cron-secret" } });
    await expect(cron.json()).resolves.toMatchObject({ ok: true, processed: 1, completed: 1, failed: 0 });
    expect(await db.reportRun.count({ where: { status: "COMPLETED" } })).toBe(1);
    expect(await db.document.count({ where: { title: { startsWith: "E2E Management Pack" }, mimeType: "application/json" } })).toBe(1);
    expect(await db.communication.count({ where: { recipient: "manager@staypilot.invalid", linkedRef: { not: null } } })).toBe(1);
  } finally {
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
