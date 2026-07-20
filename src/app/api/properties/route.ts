import { NextResponse } from "next/server";
import { z } from "zod";

import { GatewayStatus, IntegrationStatus, IntegrationType, PaymentMethod } from "@/generated/prisma/client";
import { requirePropertySession, requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({ name: z.string().trim().min(2).max(120), propertyCode: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9-]+$/), city: z.string().trim().min(1).max(100), country: z.string().trim().min(1).max(100), currency: z.string().trim().length(3).default("AED"), floors: z.number().int().min(1).max(50).default(20), roomsPerFloor: z.number().int().min(4).max(6).default(5) });
const roomTypes = [
  { name: "Standard Queen", basePrice: 420, capacity: 2, bedType: "Queen" },
  { name: "Standard Twin", basePrice: 450, capacity: 2, bedType: "Twin" },
  { name: "Deluxe King", basePrice: 590, capacity: 2, bedType: "King" },
  { name: "Premium King", basePrice: 720, capacity: 2, bedType: "King" },
  { name: "Family Suite", basePrice: 980, capacity: 4, bedType: "King + sofa bed" },
  { name: "Executive Suite", basePrice: 1450, capacity: 4, bedType: "King + sofa bed" },
];

export async function GET() {
  try {
    const auth = await requireSession();
    const db = getDb();
    await db.propertyAccess.upsert({ where: { hotelId_userId: { hotelId: auth.user.hotelId, userId: auth.user.id } }, create: { hotelId: auth.user.hotelId, userId: auth.user.id, role: auth.user.role }, update: {} });
    const access = await db.propertyAccess.findMany({ where: { userId: auth.user.id, active: true }, include: { hotel: true }, orderBy: { hotel: { name: "asc" } } });
    return NextResponse.json({ ok: true, currentHotelId: auth.hotelId, properties: access.map((item) => ({ id: item.hotel.id, name: item.hotel.name, propertyCode: item.hotel.propertyCode, location: [item.hotel.city, item.hotel.country].filter(Boolean).join(", "), role: item.role })) });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    return NextResponse.json({ ok: false }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePropertySession();
    if (auth.user.role !== "HOTEL_ADMIN") return NextResponse.json({ ok: false, message: "Administrator access required." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, message: "Complete the property name, unique code, location, floors, and 4-6 rooms per floor." }, { status: 400 });
    const db = getDb();
    if (await db.hotel.findUnique({ where: { propertyCode: parsed.data.propertyCode.toUpperCase() } })) return NextResponse.json({ ok: false, message: "Property code is already in use." }, { status: 409 });
    const source = await db.hotel.findUniqueOrThrow({ where: { id: auth.hotelId } });
    const hotel = await db.$transaction(async (tx) => {
      const row = await tx.hotel.create({ data: { name: parsed.data.name, legalName: parsed.data.name, propertyCode: parsed.data.propertyCode.toUpperCase(), addressLine1: parsed.data.city, city: parsed.data.city, state: parsed.data.city, country: parsed.data.country, currency: parsed.data.currency.toUpperCase(), phone: source.phone, email: source.email, taxRate: source.taxRate, checkInTime: source.checkInTime, checkOutTime: source.checkOutTime, timezone: source.timezone, themeAccent: source.themeAccent, themeSurface: source.themeSurface, themeSurfaceStrong: source.themeSurfaceStrong } });
      const types = await Promise.all(roomTypes.map((type) => tx.roomType.create({ data: { hotelId: row.id, ...type, description: `${type.name} accommodation`, amenities: [], active: true } })));
      for (let floor = 1; floor <= parsed.data.floors; floor += 1) {
        const blueprint = await tx.blueprint.create({ data: { hotelId: row.id, floor, name: `Floor ${floor} operating plan` } });
        for (let index = 1; index <= parsed.data.roomsPerFloor; index += 1) {
          const type = types[(floor + index) % types.length];
          const roomNumber = `${floor}${String(index).padStart(2, "0")}`;
          const room = await tx.room.create({ data: { hotelId: row.id, roomTypeId: type.id, roomNumber, floor, capacity: type.capacity } });
          await tx.blueprintZone.create({ data: { blueprintId: blueprint.id, roomId: room.id, label: `Room ${roomNumber}`, type: "ROOM", x: 40 + ((index - 1) % 3) * 220, y: 60 + Math.floor((index - 1) / 3) * 150 } });
        }
      }
      const gateways = [[PaymentMethod.CASH, "Front desk cash drawer", true, "Per shift"], [PaymentMethod.CARD, "Card terminal", false, "T+1"], [PaymentMethod.UPI, "Property UPI", false, "Instant"], [PaymentMethod.BANK_TRANSFER, "Bank transfer", true, "Manual verification"], [PaymentMethod.OTA_VCC, "OTA virtual cards", false, "Channel dependent"]] as const;
      await Promise.all(gateways.map(([method, name, enabled, settlementWindow]) => tx.paymentGateway.create({ data: { hotelId: row.id, method, name, enabled, status: enabled ? GatewayStatus.READY : GatewayStatus.OFFLINE, settlementWindow } })));
      const integrations = [["Booking.com", IntegrationType.OTA], ["Stripe", IntegrationType.PAYMENT], ["Resend Email", IntegrationType.EMAIL], ["WhatsApp Messaging", IntegrationType.WHATSAPP], ["NFC Door Locks", IntegrationType.NFC_LOCK], ["Accounting Export", IntegrationType.ACCOUNTING]] as const;
      await Promise.all(integrations.map(([name, type]) => tx.integration.create({ data: { hotelId: row.id, name, type, status: IntegrationStatus.DISCONNECTED } })));
      await Promise.all([
        tx.outlet.create({ data: { hotelId: row.id, name: "All Day Dining", type: "RESTAURANT", location: "Lobby" } }),
        tx.outlet.create({ data: { hotelId: row.id, name: "Room Service", type: "ROOM_SERVICE", location: "In-room" } }),
        tx.outlet.create({ data: { hotelId: row.id, name: "Lobby Lounge", type: "BAR", location: "Lobby" } }),
      ]);
      const businessDate = new Date(); businessDate.setUTCHours(0, 0, 0, 0);
      await tx.nightAudit.create({ data: { hotelId: row.id, businessDate, status: "PENDING", summary: "Awaiting first end-of-day close." } });
      await tx.propertyAccess.create({ data: { hotelId: row.id, userId: auth.user.id, role: "HOTEL_ADMIN" } });
      await tx.auditLog.create({ data: { hotelId: row.id, userId: auth.user.id, actorName: auth.user.name, action: "CREATE_PROPERTY", entityType: "Hotel", entityId: row.id, target: row.propertyCode } });
      return row;
    }, { timeout: 30_000 });
    return NextResponse.json({ ok: true, message: `${hotel.name} created with ${parsed.data.floors * parsed.data.roomsPerFloor} rooms.`, propertyId: hotel.id });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "UNAUTHORIZED";
    console.error("Property creation failed", error);
    return NextResponse.json({ ok: false, message: unauthorized ? "Authentication required." : "Property could not be created." }, { status: unauthorized ? 401 : 500 });
  }
}
