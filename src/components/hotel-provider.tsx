"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

import type {
  AuthUserRecord,
  BlueprintRecord,
  ComplaintRecord,
  DocumentRecord,
  HotelSnapshot,
  HousekeepingTaskRecord,
  InventoryItemRecord,
  MaintenanceTicketRecord,
  NfcAccessEventRecord,
  NotificationRecord,
  PaymentMethod,
  PolicyRecord,
  RoomCardRecord,
  RoomStatus,
  ShiftHandoverRecord,
  StaffRole,
  VendorRecord,
} from "@/lib/hotel-data";
import { initialHotelSnapshot } from "@/lib/hotel-data";

type CommandResult = { ok: boolean; message: string; invoiceId?: string; receiptId?: string };
type BookingInput = { guestName: string; phone: string; email: string; roomType: string; checkIn: string; checkOut: string; source: string; specialRequests: string; totalAmount: number; companyName?: string };
type ComplaintInput = { guestName: string; roomNumber?: string; message: string };
type MaintenanceInput = { roomNumber?: string; title: string; category: string; assignee: string; priority: MaintenanceTicketRecord["priority"]; description: string; vendorName?: string };
type RoomCardInput = { roomNumber: string; guestName?: string; accessType: RoomCardRecord["accessType"] };
type GroupReservationInput = { groupName: string; companyName?: string; roomCount: number };
type InventoryInput = Omit<InventoryItemRecord, "id">;
type VendorInput = Omit<VendorRecord, "id">;
type NotificationInput = Omit<NotificationRecord, "id" | "read" | "createdAt">;
type HandoverInput = Omit<ShiftHandoverRecord, "id" | "createdAt">;
type InvoiceInput = { guestName: string; guestEmail?: string; bookingCode?: string; roomNumber?: string; dueDate?: string; notes?: string; lineItems: Array<{ label: string; amount: number }> };
type BlueprintZoneInput = { blueprintId: string; label: string; type: BlueprintRecord["zones"][number]["type"]; linkedRoomNumber?: string };
type PolicyAnswer = { answer: string; sources: string[] };

type HotelContextType = {
  state: HotelSnapshot;
  currentUser: AuthUserRecord | null;
  hydrated: boolean;
  hasUsers: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<CommandResult>;
  logout: () => Promise<void>;
  bootstrapOwner: (input: { name: string; email: string; password: string }) => Promise<CommandResult>;
  createUser: (input: { name: string; email: string; password: string; role: AuthUserRecord["role"] }) => Promise<CommandResult>;
  resetHotelData: () => Promise<CommandResult>;
  setRoomStatus: (roomId: string, status: RoomStatus) => Promise<CommandResult>;
  createBooking: (input: BookingInput) => Promise<CommandResult>;
  checkInBooking: (bookingId: string, roomNumber: string) => Promise<CommandResult>;
  checkOutBooking: (bookingId: string) => Promise<CommandResult>;
  createGroupReservation: (input: GroupReservationInput) => Promise<CommandResult>;
  updateHousekeepingStatus: (taskId: string, status: HousekeepingTaskRecord["status"]) => Promise<CommandResult>;
  createMaintenanceTicket: (input: MaintenanceInput) => Promise<CommandResult>;
  updateMaintenanceStatus: (ticketId: string, status: MaintenanceTicketRecord["status"]) => Promise<CommandResult>;
  createComplaint: (input: ComplaintInput) => Promise<CommandResult>;
  updateComplaintStatus: (complaintId: string, status: ComplaintRecord["status"]) => Promise<CommandResult>;
  createInvoice: (input: InvoiceInput) => Promise<CommandResult>;
  recordPayment: (invoiceId: string, amount: number, paymentMethod?: PaymentMethod, reference?: string) => Promise<CommandResult>;
  refundPayment: (paymentId: string) => Promise<CommandResult>;
  togglePaymentGateway: (gatewayId: string) => Promise<CommandResult>;
  updateGuestNotes: (guestId: string, notes: string) => Promise<CommandResult>;
  updateHotelSettings: (payload: HotelSnapshot["hotel"]) => Promise<CommandResult>;
  addPolicy: (policy: Omit<PolicyRecord, "id">) => Promise<CommandResult>;
  issueRoomCard: (payload: RoomCardInput) => Promise<CommandResult>;
  updateRoomCardStatus: (cardId: string, status: RoomCardRecord["status"]) => Promise<CommandResult>;
  recordNfcEvent: (cardId: string, event: NfcAccessEventRecord["event"], location?: string) => Promise<CommandResult>;
  addBlueprintZone: (input: BlueprintZoneInput) => Promise<CommandResult>;
  removeBlueprintZone: (blueprintId: string, zoneId: string) => Promise<CommandResult>;
  addDocument: (document: Omit<DocumentRecord, "id" | "createdAt">) => Promise<CommandResult>;
  addInventoryItem: (input: InventoryInput) => Promise<CommandResult>;
  adjustInventoryItem: (itemId: string, nextStock: number) => Promise<CommandResult>;
  addVendor: (input: VendorInput) => Promise<CommandResult>;
  addNotification: (input: NotificationInput) => Promise<CommandResult>;
  markNotificationRead: (notificationId: string) => Promise<CommandResult>;
  createHandover: (input: HandoverInput) => Promise<CommandResult>;
  runNightAudit: () => Promise<CommandResult>;
  toggleIntegration: (integrationId: string) => Promise<CommandResult>;
  answerPolicyQuestion: (query: string) => PolicyAnswer;
  answerOperationsQuestion: (query: string) => string;
};

const HotelContext = createContext<HotelContextType | null>(null);

export function roleAllows(role: StaffRole, area: string) {
  const matrix: Record<StaffRole, string[]> = {
    HOTEL_ADMIN: ["*"],
    MANAGER: ["*"],
    RECEPTIONIST: ["dashboard", "front-desk", "rooms", "bookings", "guests", "billing", "payments", "complaints", "documents", "room-cards", "access", "service-ops", "blueprints"],
    HOUSEKEEPING: ["dashboard", "rooms", "housekeeping", "service-ops"],
    MAINTENANCE: ["dashboard", "maintenance", "rooms", "service-ops", "documents"],
    ACCOUNTANT: ["dashboard", "billing", "payments", "reports", "documents", "settings"],
  };
  return matrix[role].includes("*") || matrix[role].includes(area);
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  const data = (await response.json()) as T;
  return data;
}

export function HotelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HotelSnapshot>(initialHotelSnapshot);
  const [currentUser, setCurrentUser] = useState<AuthUserRecord | null>(null);
  const [hasUsers, setHasUsers] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  async function refresh() {
    const status = await jsonRequest<{ hasUsers: boolean; user: AuthUserRecord | null }>("/api/auth/status");
    setHasUsers(status.hasUsers);
    setCurrentUser(status.user);
    if (status.user) {
      const snapshot = await jsonRequest<{ state: HotelSnapshot }>("/api/hotel/state");
      setState(snapshot.state);
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const status = await jsonRequest<{ hasUsers: boolean; user: AuthUserRecord | null }>("/api/auth/status");
        if (!active) return;
        setHasUsers(status.hasUsers);
        setCurrentUser(status.user);
        if (status.user) {
          const snapshot = await jsonRequest<{ state: HotelSnapshot }>("/api/hotel/state");
          if (active) setState(snapshot.state);
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const accent = state.hotel.theme.accent;
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--sidebar-primary", accent);
    root.style.setProperty("--surface", state.hotel.theme.surface);
    root.style.setProperty("--surface-strong", state.hotel.theme.surfaceStrong);
  }, [state.hotel.theme]);

  async function command(action: string, payload: Record<string, unknown> = {}) {
    const result = await jsonRequest<CommandResult & { state?: HotelSnapshot }>("/api/hotel/command", { method: "POST", body: JSON.stringify({ action, payload }) });
    if (result.state) setState(result.state);
    return result;
  }

  const value: HotelContextType = {
    state, currentUser, hydrated, hasUsers, refresh,
    async login(email, password) { const result = await jsonRequest<CommandResult>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); if (result.ok) await refresh(); return result; },
    async logout() { await jsonRequest("/api/auth/logout", { method: "POST" }); setCurrentUser(null); setState(initialHotelSnapshot); },
    async bootstrapOwner(input) { const result = await jsonRequest<CommandResult>("/api/auth/bootstrap", { method: "POST", body: JSON.stringify(input) }); if (result.ok) await refresh(); return result; },
    createUser: (input) => command("createUser", input),
    resetHotelData: () => command("resetHotelData"),
    setRoomStatus: (roomId, status) => command("setRoomStatus", { roomId, status }),
    createBooking: (input) => command("createBooking", input),
    checkInBooking: (bookingId, roomNumber) => command("checkInBooking", { bookingId, roomNumber }),
    checkOutBooking: (bookingId) => command("checkOutBooking", { bookingId }),
    createGroupReservation: (input) => command("createGroupReservation", input),
    updateHousekeepingStatus: (taskId, status) => command("updateHousekeepingStatus", { taskId, status }),
    createMaintenanceTicket: (input) => command("createMaintenanceTicket", input),
    updateMaintenanceStatus: (ticketId, status) => command("updateMaintenanceStatus", { ticketId, status }),
    createComplaint: (input) => command("createComplaint", input),
    updateComplaintStatus: (complaintId, status) => command("updateComplaintStatus", { complaintId, status }),
    createInvoice: (input) => command("createInvoice", input),
    recordPayment: (invoiceId, amount, paymentMethod = "CASH", reference) => command("recordPayment", { invoiceId, amount, paymentMethod, reference }),
    refundPayment: (paymentId) => command("refundPayment", { paymentId }),
    togglePaymentGateway: (gatewayId) => command("togglePaymentGateway", { gatewayId }),
    updateGuestNotes: (guestId, notes) => command("updateGuestNotes", { guestId, notes }),
    updateHotelSettings: (settings) => command("updateHotelSettings", { settings }),
    addPolicy: (policy) => command("addPolicy", policy),
    issueRoomCard: (input) => command("issueRoomCard", input),
    updateRoomCardStatus: (cardId, status) => command("updateRoomCardStatus", { cardId, status }),
    recordNfcEvent: (cardId, event, location) => command("recordNfcEvent", { cardId, event, location }),
    addBlueprintZone: (input) => command("addBlueprintZone", input),
    removeBlueprintZone: (blueprintId, zoneId) => command("removeBlueprintZone", { blueprintId, zoneId }),
    addDocument: (document) => command("addDocument", document),
    addInventoryItem: (input) => command("addInventoryItem", input),
    adjustInventoryItem: (itemId, nextStock) => command("adjustInventoryItem", { itemId, nextStock }),
    addVendor: (input) => command("addVendor", input),
    addNotification: (input) => command("addNotification", input),
    markNotificationRead: (notificationId) => command("markNotificationRead", { notificationId }),
    createHandover: (input) => command("createHandover", input),
    runNightAudit: () => command("runNightAudit"),
    toggleIntegration: (integrationId) => command("toggleIntegration", { integrationId }),
    answerPolicyQuestion(query) {
      const terms = query.toLowerCase().split(/\s+/).filter((term) => term.length > 2);
      const matches = state.policies.filter((policy) => terms.some((term) => `${policy.title} ${policy.category} ${policy.content}`.toLowerCase().includes(term)));
      return matches.length ? { answer: matches[0].content, sources: matches.map((item) => item.title) } : { answer: "No matching hotel policy was found in the current knowledge base.", sources: [] };
    },
    answerOperationsQuestion(query) {
      const lowered = query.toLowerCase();
      if (lowered.includes("dirty")) { const rooms = state.rooms.filter((room) => room.status === "DIRTY").map((room) => room.roomNumber); return rooms.length ? `Dirty rooms: ${rooms.join(", ")}.` : "There are no dirty rooms."; }
      if (lowered.includes("payment") || lowered.includes("balance")) return `${state.invoices.filter((invoice) => invoice.balanceAmount > 0).length} invoices have open balances.`;
      if (lowered.includes("checkout")) return `${state.bookings.filter((booking) => booking.status === "CHECKED_OUT").length} check-outs have been completed.`;
      if (lowered.includes("nfc") || lowered.includes("card")) return `${state.roomCards.filter((card) => card.status === "ACTIVE").length} active room cards are issued.`;
      if (lowered.includes("inventory")) return `${state.inventory.filter((item) => item.stockOnHand <= item.reorderLevel).length} inventory items are at or below reorder level.`;
      if (lowered.includes("night audit")) return `${state.nightAudits.filter((item) => item.status === "COMPLETED").length} night audits have been completed.`;
      return "Try asking about dirty rooms, pending payments, completed check-outs, active room cards, inventory, or night audit.";
    },
  };

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (!context) throw new Error("useHotel must be used within HotelProvider");
  return context;
}
