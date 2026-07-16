"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function NightAuditPage() {
  const { state, runNightAudit } = useHotel();

  return (
    <AppShell
      activeHref="/night-audit"
      eyebrow="Night Audit"
      title="End-of-day financial and operational close"
      description="Run in-house night audit records, capture close summaries, and keep audit-ready documentation inside the suite."
    >
      <div className="grid gap-4">
        <section className="suite-card p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em]">Night audit control</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Completed audits: {state.nightAudits.filter((item) => item.status === "COMPLETED").length}
              </p>
            </div>
            <button onClick={runNightAudit} className="suite-button suite-button-primary">
              Run night audit
            </button>
          </div>
        </section>

        <section className="grid gap-4 2xl:grid-cols-3">
          <div className="suite-subcard px-4 py-4 text-sm">
            Open balances: {state.invoices.filter((item) => item.balanceAmount > 0).length}
          </div>
          <div className="suite-subcard px-4 py-4 text-sm">
            Unread alerts: {state.notifications.filter((item) => !item.read).length}
          </div>
          <div className="suite-subcard px-4 py-4 text-sm">
            Documents logged: {state.documents.filter((item) => item.type === "AUDIT").length}
          </div>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">Audit history</h3>
          <div className="mt-4 space-y-3">
            {state.nightAudits.map((item) => (
              <article key={item.id} className="suite-subcard px-4 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="font-medium">{item.businessDate}</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">{item.createdAt}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{item.summary}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
