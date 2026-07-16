import Link from "next/link";

import { SuiteIcon } from "@/components/suite-icon";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-4 py-12 text-[var(--foreground)]">
      <section className="suite-bezel w-full max-w-3xl">
        <div className="suite-core text-center">
          <span className="suite-eyebrow">404 • route unavailable</span>
          <p className="mt-8 font-mono text-8xl font-semibold tracking-[-0.09em] text-[var(--accent)] sm:text-[9rem]">
            404
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em]">
            This workspace does not exist.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--muted)]">
            The requested hotel module may have moved or the address may be incorrect.
            Return to the live command center to continue operations.
          </p>
          <Link href="/dashboard" className="suite-button suite-button-primary group mt-8">
            Return to command center
            <span className="grid h-7 w-7 place-items-center rounded-full bg-black/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1">
              <SuiteIcon name="arrow" className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
