import {
  BlueprintZoneType,
  GatewayStatus,
  IntegrationStatus,
  IntegrationType,
  InventoryCategory,
  NightAuditStatus,
  PaymentMethod,
  PrismaClient,
  RoomStatus,
  VendorCategory,
} from "@prisma/client";

const prisma = new PrismaClient();

const roomTypes = [
  { name: "Standard Queen", basePrice: 420, capacity: 2, bedType: "Queen", amenities: ["Wi-Fi", "Smart TV", "Work desk"] },
  { name: "Standard Twin", basePrice: 450, capacity: 2, bedType: "Twin", amenities: ["Wi-Fi", "Smart TV", "Work desk"] },
  { name: "Deluxe King", basePrice: 590, capacity: 2, bedType: "King", amenities: ["Wi-Fi", "Smart TV", "Marina view", "Minibar"] },
  { name: "Premium King", basePrice: 720, capacity: 2, bedType: "King", amenities: ["Wi-Fi", "Smart TV", "Marina view", "Lounge"] },
  { name: "Family Suite", basePrice: 980, capacity: 4, bedType: "King + sofa bed", amenities: ["Wi-Fi", "Living room", "Kitchenette", "Bathtub"] },
  { name: "Marina Suite", basePrice: 1450, capacity: 4, bedType: "King + sofa bed", amenities: ["Wi-Fi", "Panoramic view", "Living room", "Kitchenette"] },
];

function roomNumber(floor: number, index: number) {
  return `${floor}${String(index).padStart(2, "0")}`;
}

async function main() {
  const hotel = await prisma.hotel.upsert({
    where: { propertyCode: "STAYPILOT-MARINA" },
    update: {},
    create: {
      name: "StayPilot Marina",
      legalName: "StayPilot Marina Hotel LLC",
      propertyCode: "STAYPILOT-MARINA",
      addressLine1: "Dubai Marina",
      city: "Dubai",
      state: "Dubai",
      country: "United Arab Emirates",
      currency: "AED",
      phone: "+971 4 555 1818",
      email: "ops@staypilotmarina.com",
      taxRate: 5,
      checkInTime: "15:00",
      checkOutTime: "12:00",
      timezone: "Asia/Dubai",
    },
  });

  const typeRows = new Map<string, string>();
  for (const type of roomTypes) {
    const row = await prisma.roomType.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: type.name } },
      update: type,
      create: { hotelId: hotel.id, description: `${type.name} accommodation`, active: true, ...type },
    });
    typeRows.set(type.name, row.id);
  }

  for (let floor = 1; floor <= 20; floor += 1) {
    const blueprint = await prisma.blueprint.upsert({
      where: { hotelId_floor: { hotelId: hotel.id, floor } },
      update: {},
      create: { hotelId: hotel.id, floor, name: `Floor ${floor} operating plan` },
    });
    const roomsOnFloor = 4 + (floor % 3);
    for (let index = 1; index <= roomsOnFloor; index += 1) {
      const type = roomTypes[(floor + index) % roomTypes.length];
      const number = roomNumber(floor, index);
      const room = await prisma.room.upsert({
        where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber: number } },
        update: {},
        create: {
          hotelId: hotel.id,
          roomTypeId: typeRows.get(type.name)!,
          roomNumber: number,
          floor,
          status: RoomStatus.AVAILABLE,
          capacity: type.capacity,
        },
      });
      const existingZone = await prisma.blueprintZone.findFirst({
        where: { blueprintId: blueprint.id, roomId: room.id },
        select: { id: true },
      });
      if (!existingZone) {
        await prisma.blueprintZone.create({
          data: {
            blueprintId: blueprint.id,
            roomId: room.id,
            label: `Room ${number}`,
            type: BlueprintZoneType.ROOM,
            x: 40 + ((index - 1) % 3) * 220,
            y: 60 + Math.floor((index - 1) / 3) * 150,
          },
        });
      }
    }
  }

  const policies = [
    ["Late checkout policy", "Front Desk", "Late checkout until 14:00 may be approved by reception based on availability. After 14:00, half-day charges apply unless a manager waives them."],
    ["Same day cancellation policy", "Reservations", "Same-day cancellations are non-refundable unless approved by the hotel manager for a medical emergency or operational failure."],
    ["Fire emergency SOP", "Safety", "Trigger the fire protocol, guide guests to the nearest exit, call emergency services, and report headcount to the manager on duty."],
  ];
  for (const [title, category, content] of policies) {
    await prisma.policy.upsert({
      where: { hotelId_title_version: { hotelId: hotel.id, title, version: 1 } },
      update: { category, content, active: true },
      create: { hotelId: hotel.id, title, category, content },
    });
  }

  const gateways = [
    [PaymentMethod.CASH, "Front desk cash drawer", true, "Per shift"],
    [PaymentMethod.CARD, "In-house card terminal", true, "T+1"],
    [PaymentMethod.UPI, "Property UPI QR", true, "Instant"],
    [PaymentMethod.BANK_TRANSFER, "Bank transfer desk", true, "Manual verification"],
    [PaymentMethod.OTA_VCC, "OTA virtual cards", false, "Channel dependent"],
  ] as const;
  for (const [method, name, enabled, settlementWindow] of gateways) {
    await prisma.paymentGateway.upsert({
      where: { hotelId_method: { hotelId: hotel.id, method } },
      update: { name, enabled, status: enabled ? GatewayStatus.READY : GatewayStatus.OFFLINE, settlementWindow },
      create: { hotelId: hotel.id, method, name, enabled, status: enabled ? GatewayStatus.READY : GatewayStatus.OFFLINE, settlementWindow },
    });
  }

  const integrations = [
    ["Booking.com", IntegrationType.OTA, IntegrationStatus.DISCONNECTED],
    ["Stripe", IntegrationType.PAYMENT, IntegrationStatus.READY],
    ["Resend Email", IntegrationType.EMAIL, IntegrationStatus.READY],
    ["WhatsApp Messaging", IntegrationType.WHATSAPP, IntegrationStatus.DISCONNECTED],
    ["NFC Door Locks", IntegrationType.NFC_LOCK, IntegrationStatus.DISCONNECTED],
    ["QuickBooks Export", IntegrationType.ACCOUNTING, IntegrationStatus.READY],
  ] as const;
  for (const [name, type, status] of integrations) {
    await prisma.integration.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name } },
      update: { type, status },
      create: { hotelId: hotel.id, name, type, status, enabled: false },
    });
  }

  const vendor = await prisma.vendor.upsert({
    where: { hotelId_name: { hotelId: hotel.id, name: "BlueWave Linen Supply" } },
    update: {},
    create: { hotelId: hotel.id, name: "BlueWave Linen Supply", category: VendorCategory.LINEN, contact: "+971500001002", sla: "Next day" },
  });
  await prisma.vendor.upsert({
    where: { hotelId_name: { hotelId: hotel.id, name: "Marina HVAC Services" } },
    update: {},
    create: { hotelId: hotel.id, name: "Marina HVAC Services", category: VendorCategory.HVAC, contact: "+971500001001", sla: "4 hours" },
  });

  const inventory = [
    ["Bath towels", "LINEN-001", InventoryCategory.LINEN, 120, 40, vendor.id],
    ["Toiletry kits", "AMENITY-001", InventoryCategory.AMENITY, 80, 25, null],
    ["Water bottles", "MINIBAR-001", InventoryCategory.MINIBAR, 240, 90, null],
  ] as const;
  for (const [name, sku, category, stockOnHand, reorderLevel, vendorId] of inventory) {
    await prisma.inventoryItem.upsert({
      where: { hotelId_sku: { hotelId: hotel.id, sku } },
      update: { stockOnHand, reorderLevel },
      create: { hotelId: hotel.id, vendorId, name, sku, category, stockOnHand, reorderLevel },
    });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.nightAudit.upsert({
    where: { hotelId_businessDate: { hotelId: hotel.id, businessDate: today } },
    update: {},
    create: { hotelId: hotel.id, businessDate: today, status: NightAuditStatus.PENDING, summary: "Awaiting first end-of-day close." },
  });

  console.log(`Seeded ${hotel.name}: 20 floors and ${await prisma.room.count({ where: { hotelId: hotel.id } })} rooms.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
