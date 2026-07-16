"use client";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function IntegrationsPage() {
  const { state, toggleIntegration } = useHotel();

  return (
    <AppShell
      activeHref="/integrations"
      eyebrow="Integrations"
      title="Systems and channel connectivity"
      description="Control in-house integration toggles for OTA, payment, messaging, NFC lock, and accounting workflows."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {state.integrations.map((integration) => (
          <article key={integration.id} className="suite-card p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em]">
                  {integration.name}
                </h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{integration.type}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={integration.status} />
                <StatusBadge value={integration.enabled ? "ENABLED" : "DISABLED"} />
              </div>
            </div>
            <button
              onClick={() => toggleIntegration(integration.id)}
              className="suite-button suite-button-primary mt-4"
            >
              {integration.enabled ? "Disable integration" : "Enable integration"}
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
