import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusClasses: Record<string, string> = {
  AVAILABLE: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  RESERVED: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  OCCUPIED: "bg-white/[.07] text-[#ded8ce]",
  DIRTY: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  CLEANING: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  MAINTENANCE: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
  BLOCKED: "bg-white/[.06] text-[#aaa69d]",
  CONFIRMED: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  CHECKED_IN: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  CHECKED_OUT: "bg-white/[.06] text-[#aaa69d]",
  CANCELLED: "bg-white/[.06] text-[#aaa69d]",
  NO_SHOW: "bg-white/[.06] text-[#aaa69d]",
  PAID: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  CAPTURED: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  PARTIAL: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  UNPAID: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
  REFUNDED: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  PENDING: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  OPEN: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
  ACKNOWLEDGED: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  RESOLVED: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  IN_PROGRESS: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  HIGH: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
  URGENT: "bg-[rgba(215,131,118,.2)] text-[#f0b0a6]",
  MEDIUM: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  LOW: "bg-white/[.06] text-[#aaa69d]",
  HOTEL_ADMIN: "bg-white/[.08] text-white",
  MANAGER: "bg-white/[.08] text-white",
  RECEPTIONIST: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  HOUSEKEEPING: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  ACCOUNTANT: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  ACTIVE: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  READY: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  ENCODED: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  EXPIRED: "bg-white/[.06] text-[#aaa69d]",
  ACCESS_GRANTED: "bg-[rgba(114,183,151,.12)] text-[#9bd2b8]",
  ACCESS_DENIED: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
  NFC: "bg-[rgba(133,158,181,.12)] text-[#a8becf]",
  RFID: "bg-[rgba(224,183,104,.12)] text-[#e7c77f]",
  MAGSTRIPE: "bg-white/[.06] text-[#aaa69d]",
  OFFLINE: "bg-[rgba(215,131,118,.12)] text-[#e3a096]",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        statusClasses[value] ?? "bg-white/[.06] text-[#aaa69d]",
      )}
    >
      {value.replaceAll("_", " ")}
    </Badge>
  );
}
