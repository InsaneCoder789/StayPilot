"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";

import { useHotel } from "@/components/hotel-provider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { currentUser, hydrated } = useHotel();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!currentUser && pathname !== "/login") {
      router.replace("/login");
    }

    if (currentUser && pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [currentUser, hydrated, pathname, router]);

  if (!hydrated) {
    return (
      <main className="grid min-h-[100dvh] place-items-center px-4 text-[var(--foreground)]">
        <div className="suite-bezel w-full max-w-sm">
          <div className="suite-core text-center">
            <span className="mx-auto block h-2 w-2 animate-pulse rounded-full bg-[var(--accent)]" />
            <p className="mt-5 text-sm text-[var(--muted)]">
              Opening property operations
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!currentUser && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}
