import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthGate } from "@/components/auth-gate";
import { HotelProvider } from "@/components/hotel-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "StayPilot Hotel OS",
    template: "%s | StayPilot",
  },
  description:
    "Private all-in-one hotel operations, payments, access control, property planning, and guest management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <HotelProvider>
          <TooltipProvider delayDuration={250}>
            <AuthGate>{children}</AuthGate>
          </TooltipProvider>
        </HotelProvider>
      </body>
    </html>
  );
}
