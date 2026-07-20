import { expect, test } from "@playwright/test";

import { getDb } from "@/lib/db";

test("multi-property lifecycle provisions rooms and isolates active hotel state", async ({ request }) => {
  const email = "e2e-portfolio@staypilot.invalid";
  const propertyCode = `E2E-${Date.now()}`;
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });
  let propertyId = "";
  let homeHotelId = "";

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Portfolio", email, password: "StayPilot!Portfolio2026" } })).ok()).toBe(true);
    const user = await db.user.findFirstOrThrow({ where: { email } });
    homeHotelId = user.hotelId;
    const created = await request.post("/api/properties", { data: { name: "E2E City Hotel", propertyCode, city: "Pune", country: "India", currency: "INR", floors: 20, roomsPerFloor: 4 } });
    expect(created.ok()).toBe(true);
    propertyId = (await created.json() as { propertyId: string }).propertyId;

    const portfolio = await request.get("/api/properties");
    const portfolioBody = await portfolio.json() as { properties: Array<{ id: string; propertyCode: string }> };
    expect(portfolioBody.properties.some((property) => property.id === propertyId && property.propertyCode === propertyCode)).toBe(true);
    expect((await request.post("/api/properties/switch", { data: { propertyId } })).ok()).toBe(true);
    const selected = await request.get("/api/hotel/state");
    const selectedState = (await selected.json() as { state: { hotel: { hotelName: string }; rooms: Array<{ floor: number; status: string }>; outlets: Array<{ name: string }> } }).state;
    expect(selectedState.hotel.hotelName).toBe("E2E City Hotel");
    expect(selectedState.rooms).toHaveLength(80);
    expect(new Set(selectedState.rooms.map((room) => room.floor)).size).toBe(20);
    expect(selectedState.rooms.every((room) => room.status === "AVAILABLE")).toBe(true);
    expect(selectedState.outlets).toHaveLength(3);

    const roomId = (await db.room.findFirstOrThrow({ where: { hotelId: propertyId } })).id;
    expect((await request.post("/api/hotel/command", { data: { action: "setRoomStatus", payload: { roomId, status: "MAINTENANCE" } } })).ok()).toBe(true);
    expect(await db.room.count({ where: { hotelId: homeHotelId, status: "MAINTENANCE" } })).toBe(0);
    expect((await request.post("/api/properties/switch", { data: { propertyId: homeHotelId } })).ok()).toBe(true);
  } finally {
    if (homeHotelId) await request.post("/api/properties/switch", { data: { propertyId: homeHotelId } });
    if (propertyId) await db.hotel.deleteMany({ where: { id: propertyId } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});

test("department lifecycle posts guest charges and controls operational conflicts", async ({ request }) => {
  const email = "e2e-departments@staypilot.invalid";
  const outletName = `E2E Rooftop ${Date.now()}`;
  const db = getDb();
  await db.loginAttempt.deleteMany({ where: { email } });
  await db.user.deleteMany({ where: { email } });

  try {
    expect((await request.post("/api/auth/bootstrap", { data: { name: "E2E Departments", email, password: "StayPilot!Departments2026" } })).ok()).toBe(true);
    const command = async (action: string, payload: Record<string, unknown> = {}) => {
      const response = await request.post("/api/hotel/command", { data: { action, payload } });
      return response.json() as Promise<{ ok: boolean; message: string; state?: {
        outlets: Array<{ id: string }>;
        invoices: Array<{ id: string; totalAmount: number }>;
        outletOrders: Array<{ id: string; status: string }>;
        eventBookings: Array<{ id: string; status: string }>;
        serviceAppointments: Array<{ id: string; status: string }>;
        transportRequests: Array<{ id: string; status: string }>;
      } }>;
    };
    let result = await command("createInvoice", { guestName: "Department Guest", bookingCode: "DEPT-FOLIO", lineItems: [{ label: "Room", amount: 100 }] });
    const invoiceId = result.state!.invoices[0].id;
    result = await command("createOutlet", { name: outletName, type: "BAR", location: "Roof" });
    const outletId = result.state!.outlets.find((item) => item.id)!.id;
    result = await command("createOutletOrder", { outletId, invoiceId, guestName: "Department Guest", lines: [{ label: "Dinner", quantity: 2, unitAmount: 25 }] });
    const orderId = result.state!.outletOrders[0].id;
    expect((await command("updateOutletOrderStatus", { orderId, status: "PREPARING" })).ok).toBe(true);
    expect((await command("updateOutletOrderStatus", { orderId, status: "SERVED" })).ok).toBe(true);
    result = await command("updateOutletOrderStatus", { orderId, status: "POSTED" });
    expect(result.state!.invoices.find((invoice) => invoice.id === invoiceId)?.totalAmount).toBe(150);

    const startsAt = new Date(Date.now() + 86_400_000).toISOString();
    const endsAt = new Date(Date.now() + 90_000_000).toISOString();
    result = await command("createEventBooking", { eventName: "Board dinner", contactName: "Event Guest", venue: "Grand Hall", attendees: 20, startsAt, endsAt, estimatedValue: 1000 });
    const eventId = result.state!.eventBookings[0].id;
    expect((await command("createEventBooking", { eventName: "Conflicting dinner", contactName: "Other Guest", venue: "Grand Hall", attendees: 10, startsAt, endsAt, estimatedValue: 500 })).ok).toBe(false);
    expect((await command("updateEventBookingStatus", { eventId, status: "CONFIRMED" })).ok).toBe(true);

    result = await command("createServiceAppointment", { department: "SPA", serviceName: "Massage", guestName: "Department Guest", invoiceId, staffName: "Asha", startsAt, endsAt, chargeAmount: 40 });
    const appointmentId = result.state!.serviceAppointments[0].id;
    expect((await command("createServiceAppointment", { department: "SPA", serviceName: "Facial", guestName: "Other Guest", staffName: "Asha", startsAt, endsAt, chargeAmount: 30 })).ok).toBe(false);
    expect((await command("updateServiceAppointmentStatus", { appointmentId, status: "CHECKED_IN" })).ok).toBe(true);
    expect((await command("updateServiceAppointmentStatus", { appointmentId, status: "IN_SERVICE" })).ok).toBe(true);
    result = await command("updateServiceAppointmentStatus", { appointmentId, status: "COMPLETED" });
    expect(result.state!.invoices.find((invoice) => invoice.id === invoiceId)?.totalAmount).toBe(190);

    result = await command("createTransportRequest", { guestName: "Department Guest", pickupLocation: "Airport", dropoffLocation: "Hotel", pickupAt: startsAt, vehicleType: "SEDAN", chargeAmount: 25 });
    const requestId = result.state!.transportRequests[0].id;
    expect((await command("updateTransportRequestStatus", { requestId, status: "CONFIRMED" })).ok).toBe(true);
    expect((await command("updateTransportRequestStatus", { requestId, status: "DISPATCHED", driverName: "Hotel Driver" })).ok).toBe(true);
    expect((await command("updateTransportRequestStatus", { requestId, status: "COMPLETED" })).ok).toBe(true);

    result = await command("resetHotelData");
    expect(result.state).toMatchObject({ outletOrders: [], eventBookings: [], serviceAppointments: [], transportRequests: [], invoices: [] });
  } finally {
    await request.post("/api/hotel/command", { data: { action: "resetHotelData", payload: {} } });
    await db.outlet.deleteMany({ where: { name: outletName } });
    await db.loginAttempt.deleteMany({ where: { email } });
    await db.user.deleteMany({ where: { email } });
    await db.$disconnect();
  }
});
