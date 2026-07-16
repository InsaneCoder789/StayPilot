import type { ComponentProps } from "react";
import {
  ArrowRight,
  BedDouble,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  ClipboardPenLine,
  CreditCard,
  FileText,
  Grid2X2,
  KeyRound,
  Landmark,
  Menu,
  MessageSquareWarning,
  Moon,
  PlugZap,
  ReceiptText,
  Search,
  Settings2,
  Sparkles,
  UsersRound,
  WalletCards,
  Waves,
  Wrench,
} from "lucide-react";

const icons = {
  grid: Grid2X2,
  desk: Landmark,
  bed: BedDouble,
  calendar: CalendarDays,
  users: UsersRound,
  sparkle: Sparkles,
  wrench: Wrench,
  box: Boxes,
  wallet: WalletCards,
  receipt: ReceiptText,
  chart: ChartNoAxesColumnIncreasing,
  key: KeyRound,
  pulse: Waves,
  bell: Bell,
  handover: ClipboardPenLine,
  moon: Moon,
  plug: PlugZap,
  document: FileText,
  message: MessageSquareWarning,
  book: BookOpen,
  settings: Settings2,
  blueprint: CreditCard,
  arrow: ArrowRight,
  search: Search,
  menu: Menu,
} as const;

export type IconName = keyof typeof icons;

export function SuiteIcon({
  name,
  strokeWidth = 1.75,
  ...props
}: ComponentProps<typeof Search> & { name: IconName }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={strokeWidth} {...props} />;
}
