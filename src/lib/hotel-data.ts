export type RoomStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "DIRTY"
  | "CLEANING"
  | "MAINTENANCE"
  | "BLOCKED";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type StaffRole =
  | "HOTEL_ADMIN"
  | "MANAGER"
  | "RECEPTIONIST"
  | "HOUSEKEEPING"
  | "MAINTENANCE"
  | "ACCOUNTANT";

export type PaymentStatus = "PAID" | "PARTIAL" | "UNPAID";
export type PaymentMethod =
  | "CASH"
  | "CARD"
  | "UPI"
  | "BANK_TRANSFER"
  | "OTA_VCC";

export type ThemeConfig = {
  mode: "dark";
  accent: string;
  surface: string;
  surfaceStrong: string;
};

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export type RoomRecord = {
  id: string;
  roomNumber: string;
  roomType: string;
  floor: number;
  status: RoomStatus;
  capacity: number;
  guestName?: string;
  nextBooking?: string;
  housekeepingNote?: string;
  outOfService?: boolean;
};

export type GuestRecord = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  nationality: string;
  vipStatus: boolean;
  preferences: string[];
  notes: string;
  stayCount: number;
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  companyName?: string;
  blacklisted?: boolean;
};

export type BookingRecord = {
  id: string;
  code: string;
  guestId: string;
  guestName: string;
  roomType: string;
  roomNumber?: string;
  status: BookingStatus;
  source: string;
  checkIn: string;
  checkOut: string;
  paymentStatus: PaymentStatus;
  advancePaid: number;
  depositRequired?: number;
  totalAmount: number;
  specialRequests: string;
  companyName?: string;
  groupReservationId?: string;
  cancellationReason?: string;
};

export type HousekeepingTaskRecord = {
  id: string;
  roomNumber: string;
  roomType: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  priority: Priority;
  checkoutTime: string;
  nextCheckInTime?: string;
  assignee: string;
  checklistComplete?: boolean;
};

export type MaintenanceTicketRecord = {
  id: string;
  roomNumber?: string;
  title: string;
  category: string;
  priority: Priority;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  assignee: string;
  description: string;
  vendorName?: string;
};

export type ComplaintRecord = {
  id: string;
  guestName: string;
  roomNumber?: string;
  category: string;
  priority: Priority;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  department: string;
  message: string;
};

export type InvoiceRecord = {
  id: string;
  invoiceNumber?: string;
  bookingCode: string;
  guestName: string;
  guestEmail?: string;
  roomNumber?: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: PaymentStatus;
  lineItems: Array<{ label: string; amount: number }>;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  currency?: string;
};

export type PaymentRecord = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  receiptNumber: string;
  guestName: string;
  amount: number;
  method: PaymentMethod;
  status: "PENDING" | "CAPTURED" | "PARTIALLY_REFUNDED" | "REFUNDED";
  amountRefunded: number;
  provider: string;
  reference: string;
  processedAt: string;
  processedBy: string;
};

export type PaymentRequestRecord = {
  id: string;
  invoiceId: string;
  provider: string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED" | "FAILED";
  checkoutUrl?: string;
  createdAt: string;
};

export type CashierShiftRecord = {
  id: string;
  openedBy: string;
  openingFloat: number;
  expectedCash: number;
  closingCash?: number;
  variance?: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string;
};

export type CashMovementRecord = {
  id: string;
  shiftId: string;
  type: "OPENING_FLOAT" | "CASH_IN" | "CASH_OUT" | "SAFE_DROP" | "CLOSING_COUNT";
  amount: number;
  reference?: string;
  note?: string;
  createdBy: string;
  createdAt: string;
};

export type CreditNoteRecord = {
  id: string;
  invoiceId: string;
  creditNoteNumber: string;
  amount: number;
  reason: string;
  issuedBy: string;
  issuedAt: string;
};

export type ReconciliationRecord = {
  id: string;
  method: PaymentMethod;
  provider: string;
  periodStart: string;
  periodEnd: string;
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  status: "MATCHED" | "VARIANCE" | "REVIEWED";
  completedBy: string;
  completedAt: string;
};

export type ReceiptRecord = {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  guestName: string;
  amount: number;
  method: PaymentMethod;
  issuedAt: string;
};

export type PolicyRecord = {
  id: string;
  title: string;
  category: string;
  content: string;
};

export type StaffRecord = {
  id: string;
  name: string;
  role: StaffRole;
  shift: string;
  load: string;
};

export type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: StaffRole;
  active: boolean;
  status?: "ACTIVE" | "INVITED" | "DISABLED";
  mfaEnabled?: boolean;
};

export type RoomCardRecord = {
  id: string;
  roomNumber: string;
  guestName?: string;
  status: "READY" | "ENCODED" | "ACTIVE" | "EXPIRED";
  accessType: "NFC" | "MAGSTRIPE" | "RFID";
  issuedAt?: string;
};

export type NfcAccessEventRecord = {
  id: string;
  cardId: string;
  roomNumber: string;
  guestName?: string;
  event: "ENCODED" | "ACCESS_GRANTED" | "ACCESS_DENIED" | "EXPIRED";
  location: string;
  occurredAt: string;
};

export type BlueprintZoneRecord = {
  id: string;
  label: string;
  type: "ROOM" | "LOBBY" | "SERVICE" | "STAIR" | "LIFT" | "AMENITY";
  linkedRoomNumber?: string;
};

export type BlueprintRecord = {
  id: string;
  name: string;
  floor: number;
  updatedAt: string;
  zones: BlueprintZoneRecord[];
};

export type PaymentGatewayRecord = {
  id: string;
  name: string;
  method: PaymentMethod;
  enabled: boolean;
  status: "READY" | "OFFLINE";
  settlementWindow: string;
};

export type DocumentRecord = {
  id: string;
  title: string;
  type: "INVOICE" | "CREDIT_NOTE" | "POLICY" | "GUEST_FORM" | "ROOM_CARD_LOG" | "AUDIT" | "HANDOVER" | "RECEIPT" | "BLUEPRINT" | "OTHER";
  linkedRef: string;
  createdAt: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  downloadable: boolean;
};

export type DocumentTemplateRecord = {
  id: string;
  name: string;
  type: DocumentRecord["type"];
  subject?: string;
  content: string;
  active: boolean;
  createdBy: string;
  updatedAt: string;
};

export type CommunicationRecord = {
  id: string;
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  recipient: string;
  subject?: string;
  body: string;
  status: "DRAFT" | "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  provider?: string;
  linkedRef?: string;
  error?: string;
  createdBy: string;
  createdAt: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  severity: Priority;
  audience: StaffRole | "ALL";
  read: boolean;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  action: string;
  actor: string;
  target: string;
  createdAt: string;
};

export type InventoryItemRecord = {
  id: string;
  name: string;
  category: "LINEN" | "AMENITY" | "MINIBAR" | "HOUSEKEEPING" | "ENGINEERING";
  stockOnHand: number;
  reorderLevel: number;
  vendorName?: string;
};

export type OperationalTaskRecord = {
  id: string;
  department: string;
  title: string;
  description: string;
  priority: Priority;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  assignee: string;
  dueAt?: string;
  createdBy: string;
  createdAt: string;
};

export type PurchaseOrderRecord = {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";
  totalAmount: number;
  notes?: string;
  requestedBy: string;
  createdAt: string;
  lines: Array<{ id: string; inventoryItemId: string; itemName: string; quantityOrdered: number; quantityReceived: number; unitCost: number }>;
};

export type InventoryMovementRecord = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  type: "RECEIPT" | "ISSUE" | "ADJUSTMENT" | "WASTE" | "TRANSFER";
  quantityDelta: number;
  resultingStock: number;
  reference?: string;
  note?: string;
  recordedBy: string;
  createdAt: string;
};

export type IncidentRecord = {
  id: string;
  roomNumber?: string;
  type: string;
  title: string;
  description: string;
  severity: Priority;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "CLOSED";
  reportedBy: string;
  assignedTo?: string;
  occurredAt: string;
};

export type LostFoundRecord = {
  id: string;
  itemCode: string;
  roomNumber?: string;
  category: string;
  description: string;
  foundLocation: string;
  storageLocation?: string;
  status: "REPORTED" | "STORED" | "CLAIMED" | "RETURNED" | "DISPOSED";
  guestName?: string;
  guestContact?: string;
  foundAt: string;
  recordedBy: string;
};

export type VendorRecord = {
  id: string;
  name: string;
  category: "HVAC" | "PLUMBING" | "LINEN" | "IT" | "SUPPLIER";
  contact: string;
  sla: string;
};

export type GroupReservationRecord = {
  id: string;
  groupName: string;
  bookingCodes: string[];
  companyName?: string;
  roomCount: number;
};

export type ShiftHandoverRecord = {
  id: string;
  department: "FRONT_DESK" | "HOUSEKEEPING" | "MAINTENANCE";
  note: string;
  author: string;
  createdAt: string;
};

export type NightAuditRecord = {
  id: string;
  businessDate: string;
  status: "PENDING" | "COMPLETED";
  summary: string;
  createdAt: string;
};

export type IntegrationRecord = {
  id: string;
  name: string;
  type: "OTA" | "PAYMENT" | "EMAIL" | "WHATSAPP" | "NFC_LOCK" | "ACCOUNTING";
  enabled: boolean;
  status: "DISCONNECTED" | "READY" | "CONNECTED";
};

export type HotelDetails = {
  hotelName: string;
  location: string;
  checkInTime: string;
  checkOutTime: string;
  taxRate: number;
  timezone: string;
  phone: string;
  email: string;
  theme: ThemeConfig;
};

export type HotelSnapshot = {
  hotel: HotelDetails;
  rooms: RoomRecord[];
  guests: GuestRecord[];
  bookings: BookingRecord[];
  housekeeping: HousekeepingTaskRecord[];
  maintenance: MaintenanceTicketRecord[];
  complaints: ComplaintRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
  paymentRequests: PaymentRequestRecord[];
  cashierShifts: CashierShiftRecord[];
  cashMovements: CashMovementRecord[];
  creditNotes: CreditNoteRecord[];
  reconciliations: ReconciliationRecord[];
  receipts: ReceiptRecord[];
  policies: PolicyRecord[];
  staff: StaffRecord[];
  users: AuthUserRecord[];
  roomCards: RoomCardRecord[];
  nfcEvents: NfcAccessEventRecord[];
  blueprints: BlueprintRecord[];
  paymentGateways: PaymentGatewayRecord[];
  documents: DocumentRecord[];
  documentTemplates: DocumentTemplateRecord[];
  communications: CommunicationRecord[];
  notifications: NotificationRecord[];
  auditLogs: AuditLogRecord[];
  inventory: InventoryItemRecord[];
  operationalTasks: OperationalTaskRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  inventoryMovements: InventoryMovementRecord[];
  incidents: IncidentRecord[];
  lostFound: LostFoundRecord[];
  vendors: VendorRecord[];
  groupReservations: GroupReservationRecord[];
  handovers: ShiftHandoverRecord[];
  nightAudits: NightAuditRecord[];
  integrations: IntegrationRecord[];
};

const roomTypes = [
  "Standard Queen",
  "Standard Twin",
  "Deluxe King",
  "Premium King",
  "Family Suite",
  "Marina Suite",
];

function createRoomNumber(floor: number, index: number) {
  return `${floor}${String(index).padStart(2, "0")}`;
}

function generateRooms() {
  const rooms: RoomRecord[] = [];
  for (let floor = 1; floor <= 20; floor += 1) {
    const roomsOnFloor = 4 + (floor % 3);
    for (let index = 1; index <= roomsOnFloor; index += 1) {
      rooms.push({
        id: `r-${createRoomNumber(floor, index)}`,
        roomNumber: createRoomNumber(floor, index),
        roomType: roomTypes[(floor + index) % roomTypes.length],
        floor,
        status: "AVAILABLE",
        capacity:
          roomTypes[(floor + index) % roomTypes.length].includes("Suite") ? 4 : 2,
      });
    }
  }
  return rooms;
}

const generatedRooms = generateRooms();
const currentBusinessDate = new Date().toISOString().slice(0, 10);

export const initialHotelSnapshot: HotelSnapshot = {
  hotel: {
    hotelName: "StayPilot Marina",
    location: "Dubai Marina, UAE",
    checkInTime: "15:00",
    checkOutTime: "12:00",
    taxRate: 5,
    timezone: "Asia/Dubai",
    phone: "+971 4 555 1818",
    email: "ops@staypilotmarina.com",
    theme: {
      mode: "dark",
      accent: "#8eb69b",
      surface: "#13191d",
      surfaceStrong: "#1a2329",
    },
  },
  rooms: generatedRooms,
  guests: [],
  bookings: [],
  housekeeping: [],
  maintenance: [],
  complaints: [],
  invoices: [],
  payments: [],
  paymentRequests: [],
  cashierShifts: [],
  cashMovements: [],
  creditNotes: [],
  reconciliations: [],
  receipts: [],
  policies: [
    {
      id: "p-1",
      title: "Late checkout policy",
      category: "Front Desk",
      content:
        "Late checkout until 14:00 may be approved by reception based on availability. After 14:00, half-day charges apply unless manager waives them.",
    },
    {
      id: "p-2",
      title: "Same day cancellation policy",
      category: "Reservations",
      content:
        "Same-day cancellations are non-refundable unless approved by the hotel manager for medical emergency or operational failure.",
    },
    {
      id: "p-3",
      title: "Fire emergency SOP",
      category: "Safety",
      content:
        "Staff must trigger the fire protocol, guide guests to the nearest exit, call emergency services, and report headcount to the manager on duty.",
    },
  ],
  staff: [],
  users: [],
  roomCards: [],
  nfcEvents: [],
  blueprints: Array.from({ length: 20 }, (_, index) => ({
    id: `bp-${index + 1}`,
    name: `Floor ${index + 1} operating plan`,
    floor: index + 1,
    updatedAt: "Not edited",
    zones: generatedRooms
      .filter((room) => room.floor === index + 1)
      .map((room) => ({
        id: `zone-${room.id}`,
        label: `Room ${room.roomNumber}`,
        type: "ROOM" as const,
        linkedRoomNumber: room.roomNumber,
      })),
  })),
  paymentGateways: [
    {
      id: "gateway-cash",
      name: "Front desk cash drawer",
      method: "CASH",
      enabled: true,
      status: "READY",
      settlementWindow: "Per shift",
    },
    {
      id: "gateway-card",
      name: "In-house card terminal",
      method: "CARD",
      enabled: true,
      status: "READY",
      settlementWindow: "T+1",
    },
    {
      id: "gateway-upi",
      name: "Property UPI QR",
      method: "UPI",
      enabled: true,
      status: "READY",
      settlementWindow: "Instant",
    },
    {
      id: "gateway-bank",
      name: "Bank transfer desk",
      method: "BANK_TRANSFER",
      enabled: true,
      status: "READY",
      settlementWindow: "Manual verification",
    },
    {
      id: "gateway-ota",
      name: "OTA virtual cards",
      method: "OTA_VCC",
      enabled: false,
      status: "OFFLINE",
      settlementWindow: "Channel dependent",
    },
  ],
  documents: [],
  documentTemplates: [],
  communications: [],
  notifications: [],
  auditLogs: [],
  inventory: [
    { id: "inv-1", name: "Bath towels", category: "LINEN", stockOnHand: 120, reorderLevel: 40 },
    { id: "inv-2", name: "Toiletry kits", category: "AMENITY", stockOnHand: 80, reorderLevel: 25 },
    { id: "inv-3", name: "Water bottles", category: "MINIBAR", stockOnHand: 240, reorderLevel: 90 },
  ],
  operationalTasks: [],
  purchaseOrders: [],
  inventoryMovements: [],
  incidents: [],
  lostFound: [],
  vendors: [
    { id: "v-1", name: "Marina HVAC Services", category: "HVAC", contact: "+971500001001", sla: "4 hours" },
    { id: "v-2", name: "BlueWave Linen Supply", category: "LINEN", contact: "+971500001002", sla: "Next day" },
  ],
  groupReservations: [],
  handovers: [],
  nightAudits: [
    {
      id: "na-1",
      businessDate: currentBusinessDate,
      status: "PENDING",
      summary: "Awaiting first end-of-day close.",
      createdAt: `${currentBusinessDate} 00:00`,
    },
  ],
  integrations: [
    { id: "int-1", name: "Booking.com", type: "OTA", enabled: false, status: "DISCONNECTED" },
    { id: "int-2", name: "Stripe", type: "PAYMENT", enabled: false, status: "READY" },
    { id: "int-3", name: "Resend Email", type: "EMAIL", enabled: false, status: "READY" },
    { id: "int-4", name: "WhatsApp Messaging", type: "WHATSAPP", enabled: false, status: "DISCONNECTED" },
    { id: "int-5", name: "NFC Door Locks", type: "NFC_LOCK", enabled: false, status: "DISCONNECTED" },
    { id: "int-6", name: "QuickBooks Export", type: "ACCOUNTING", enabled: false, status: "READY" },
  ],
};

export function getRoomStatusCounts(rooms: RoomRecord[]) {
  return {
    available: rooms.filter((room) => room.status === "AVAILABLE").length,
    occupied: rooms.filter((room) => room.status === "OCCUPIED").length,
    dirty: rooms.filter((room) => room.status === "DIRTY").length,
    cleaning: rooms.filter((room) => room.status === "CLEANING").length,
    maintenance: rooms.filter((room) => room.status === "MAINTENANCE").length,
    reserved: rooms.filter((room) => room.status === "RESERVED").length,
    blocked: rooms.filter((room) => room.status === "BLOCKED").length,
  };
}

export function getDashboardMetrics(state: HotelSnapshot) {
  const roomCounts = getRoomStatusCounts(state.rooms);
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      label: "Occupancy",
      value: `${Math.round(
        (roomCounts.occupied / Math.max(state.rooms.length, 1)) * 100,
      )}%`,
      helper: `${roomCounts.occupied} occupied rooms`,
    },
    {
      label: "Arrivals today",
      value: `${state.bookings.filter((booking) => booking.checkIn === today).length}`,
      helper: "Front desk queue",
    },
    {
      label: "Dirty rooms",
      value: `${roomCounts.dirty}`,
      helper: "Needs housekeeping turnover",
    },
    {
      label: "Pending payments",
      value: `${state.invoices.filter((invoice) => invoice.balanceAmount > 0).length}`,
      helper: "Open balances",
    },
  ];
}
