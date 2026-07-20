"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import { roleAllows, useHotel } from "@/components/hotel-provider";
import { SuiteIcon, type IconName } from "@/components/suite-icon";
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  area: string;
  icon: IconName;
  keywords?: string;
};

const navigation: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Operate",
    items: [
      { href: "/dashboard", label: "Command center", area: "dashboard", icon: "grid", keywords: "home overview" },
      { href: "/front-desk", label: "Front desk", area: "front-desk", icon: "desk", keywords: "arrivals departures check in" },
      { href: "/rooms", label: "Room control", area: "rooms", icon: "bed", keywords: "floor availability occupancy" },
      { href: "/bookings", label: "Reservations", area: "bookings", icon: "calendar", keywords: "booking arrival" },
      { href: "/group-reservations", label: "Groups", area: "bookings", icon: "users" },
      { href: "/guests", label: "Guest profiles", area: "guests", icon: "users" },
    ],
  },
  {
    label: "Property",
    items: [
      { href: "/housekeeping", label: "Housekeeping", area: "housekeeping", icon: "sparkle", keywords: "clean dirty inspect" },
      { href: "/maintenance", label: "Engineering", area: "maintenance", icon: "wrench", keywords: "repair work order" },
      { href: "/inventory", label: "Inventory", area: "service-ops", icon: "box", keywords: "stock supplies" },
      { href: "/procurement", label: "Procurement", area: "procurement", icon: "box", keywords: "purchase order receiving vendor" },
      { href: "/vendors", label: "Vendors", area: "service-ops", icon: "handover" },
      { href: "/blueprints", label: "Blueprints", area: "blueprints", icon: "blueprint", keywords: "floor plan zones" },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/billing", label: "Invoice studio", area: "billing", icon: "document", keywords: "folio pdf" },
      { href: "/payments", label: "Payments", area: "payments", icon: "wallet", keywords: "charge refund gateway" },
      { href: "/receipts", label: "Receipt gateway", area: "payments", icon: "receipt", keywords: "pdf email" },
      { href: "/reports", label: "Reports", area: "reports", icon: "chart", keywords: "revenue occupancy" },
      { href: "/night-audit", label: "Night audit", area: "reports", icon: "moon", keywords: "close day" },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/room-cards", label: "Keys & NFC", area: "room-cards", icon: "key", keywords: "encode card access" },
      { href: "/access-tracker", label: "Access tracker", area: "access", icon: "pulse", keywords: "door event denied" },
      { href: "/service-ops", label: "Service ops", area: "service-ops", icon: "pulse", keywords: "request task" },
      { href: "/notifications", label: "Notifications", area: "dashboard", icon: "bell", keywords: "alerts" },
      { href: "/handovers", label: "Handovers", area: "service-ops", icon: "handover", keywords: "shift notes" },
      { href: "/documents", label: "Documents", area: "documents", icon: "document", keywords: "pdf policy" },
      { href: "/complaints", label: "Guest issues", area: "complaints", icon: "message", keywords: "complaint resolution" },
      { href: "/ai-assistant", label: "Knowledge", area: "dashboard", icon: "book", keywords: "policy help" },
      { href: "/integrations", label: "Integrations", area: "settings", icon: "plug", keywords: "channel gateway" },
      { href: "/settings", label: "Settings", area: "settings", icon: "settings", keywords: "team property roles" },
    ],
  },
];

type AppShellProps = {
  activeHref: string;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

const NAV_SCROLL_KEY = "staypilot-nav-scroll";

export function AppShell({ activeHref, eyebrow, title, description, children }: AppShellProps) {
  const router = useRouter();
  const { currentUser, state, logout } = useHotel();
  const navRef = useRef<HTMLDivElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const unreadNotifications = state.notifications.filter((item) => !item.read).length;
  const todayLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const visibleGroups = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        currentUser ? roleAllows(currentUser.role, item.area) : true,
      ),
    }))
    .filter((group) => group.items.length > 0);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    nav.scrollTop = Number(window.sessionStorage.getItem(NAV_SCROLL_KEY) ?? 0);
    const handleScroll = () => window.sessionStorage.setItem(NAV_SCROLL_KEY, String(nav.scrollTop));
    nav.addEventListener("scroll", handleScroll, { passive: true });
    return () => nav.removeEventListener("scroll", handleScroll);
  }, []);

  const navigate = (href: string) => {
    setCommandOpen(false);
    setMobileOpen(false);
    router.push(href, { scroll: false });
  };

  const renderNavigation = (mobile = false) => (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-[72px] shrink-0 items-center px-5">
        <Link href="/dashboard" scroll={false} onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">S</span>
          <span className="leading-none">
            <span className="block text-sm font-bold tracking-[-0.02em]">StayPilot</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Hotel operating system</span>
          </span>
        </Link>
      </div>

      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/55 px-3 text-left text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SuiteIcon name="search" className="size-4" />
          <span>Search workspaces</span>
          <kbd className="ml-auto rounded border border-sidebar-border bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>
      </div>

      <ScrollArea ref={mobile ? undefined : navRef} className="min-h-0 flex-1 px-3">
        <nav className="pb-5" aria-label="Main navigation">
          {visibleGroups.map((group) => (
            <section key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/65">{group.label}</p>
              <div className="grid gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      scroll={false}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                        isActive && "bg-sidebar-accent text-foreground shadow-[inset_2px_0_0_var(--primary)]",
                      )}
                    >
                      <SuiteIcon name={item.icon} className={cn("size-[17px]", isActive && "text-primary")} />
                      <span>{item.label}</span>
                      {item.href === "/notifications" && unreadNotifications > 0 ? (
                        <Badge className="ml-auto h-5 min-w-5 justify-center rounded-md px-1.5 text-[10px]">{unreadNotifications}</Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-2 px-2 text-[11px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_0_3px_rgba(142,182,155,0.12)]" />
          <span>All systems operational</span>
          <span className="ml-auto font-mono text-[10px]">{todayLabel}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-12 w-full justify-start px-2 font-normal">
              <Avatar size="sm" className="size-8">
                <AvatarFallback className="bg-primary/12 font-semibold text-primary">{(currentUser?.name ?? "S").slice(0, 1).toUpperCase()}</AvatarFallback>
                <AvatarBadge />
              </Avatar>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium text-foreground">{currentUser?.name ?? "No session"}</span>
                <span className="block truncate text-[11px] capitalize text-muted-foreground">{currentUser?.role.replaceAll("_", " ") ?? "Signed out"}</span>
              </span>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuLabel>Property account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/settings")}><Settings /> Settings</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={logout}><LogOut /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      <a href="#main-content" className="suite-skip-link">Skip to content</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-sidebar-border lg:block">
        {renderNavigation()}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(88vw,320px)] gap-0 border-sidebar-border p-0" showCloseButton>
          <SheetTitle className="sr-only">Main navigation</SheetTitle>
          <SheetDescription className="sr-only">Hotel operations workspaces</SheetDescription>
          {renderNavigation(true)}
        </SheetContent>
      </Sheet>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen} title="Go to a workspace" description="Search all hotel operations workspaces">
        <CommandInput placeholder="Search rooms, payments, housekeeping…" />
        <CommandList className="max-h-[min(60vh,460px)]">
          <CommandEmpty>No matching workspace found.</CommandEmpty>
          {visibleGroups.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem key={item.href} value={`${item.label} ${item.keywords ?? ""}`} onSelect={() => navigate(item.href)} className="min-h-10">
                  <SuiteIcon name={item.icon} className="size-4 text-muted-foreground" />
                  <span>{item.label}</span>
                  {item.href === activeHref ? <CommandShortcut>Current</CommandShortcut> : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center border-b border-border/80 bg-background/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-2 lg:hidden" aria-label="Open navigation">
            <SuiteIcon name="menu" className="size-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-muted-foreground">{state.hotel.hotelName}</p>
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">{eyebrow}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/payments" scroll={false}><SuiteIcon name="wallet" /> Take payment</Link>
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="relative">
                  <Link href="/notifications" scroll={false} aria-label={`${unreadNotifications} unread notifications`}>
                    <SuiteIcon name="bell" />
                    {unreadNotifications > 0 ? <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-destructive" /> : null}
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Notifications</TooltipContent>
            </Tooltip>
          </div>
        </header>

        <section id="main-content" className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-7 flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</span>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-[30px]">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" />
              <strong className="font-medium text-foreground">Live</strong>
              <span>{state.rooms.length} rooms · 20 floors</span>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
