"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { useHotel } from "@/components/hotel-provider";
import { StatusBadge } from "@/components/status-badge";

export default function IntegrationsPage() {
  const { state, toggleIntegration, registerNfcDevice } = useHotel();
  const [device, setDevice] = useState({ name: "", deviceCode: "", location: "Front desk encoder" });
  const [deviceToken, setDeviceToken] = useState("");
  const [message, setMessage] = useState("");
  const successful = state.integrationSyncs.filter((sync) => sync.status === "SUCCEEDED").length;
  const failed = state.integrationSyncs.filter((sync) => sync.status === "FAILED").length;

  return (
    <AppShell activeHref="/integrations" eyebrow="Integrations" title="Hotel integration bridge" description="Operate provider-neutral connections for channels, point of sale, accounting, messaging, payments, and physical access without hiding connectivity or delivery state.">
      <section className="grid gap-4 md:grid-cols-4">{[["Configured", state.integrations.filter((item) => item.enabled).length, "Enabled adapters"], ["NFC bridges", state.nfcDevices.length, `${state.nfcDevices.filter((item) => item.status === "ONLINE").length} online`], ["Successful syncs", successful, "Idempotent events"], ["Failed syncs", failed, "Require review"]].map(([label, value, helper]) => <div key={label} className="suite-card p-5"><p className="suite-label">{label}</p><p className="mt-3 font-mono text-3xl font-semibold">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{helper}</p></div>)}</section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="suite-card p-6"><span className="suite-eyebrow">Adapter registry</span><h2 className="mt-4 text-2xl font-semibold">Connected capabilities</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{state.integrations.map((integration) => <article key={integration.id} className="suite-subcard p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{integration.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{integration.type}</p></div><StatusBadge value={integration.status} /></div><button onClick={() => toggleIntegration(integration.id)} className="suite-button suite-button-secondary mt-4">{integration.enabled ? "Disable adapter" : "Enable adapter"}</button></article>)}</div></div>
        <div className="suite-card p-6"><span className="suite-eyebrow">Hardware enrollment</span><h2 className="mt-4 text-2xl font-semibold">Register NFC bridge</h2><div className="mt-5 grid gap-3"><input className="suite-input" value={device.name} onChange={(event) => setDevice((current) => ({ ...current, name: event.target.value }))} placeholder="Encoder or controller name" /><input className="suite-input font-mono" value={device.deviceCode} onChange={(event) => setDevice((current) => ({ ...current, deviceCode: event.target.value }))} placeholder="Unique device code" /><input className="suite-input" value={device.location} onChange={(event) => setDevice((current) => ({ ...current, location: event.target.value }))} placeholder="Physical location" /><button className="suite-button suite-button-primary" onClick={async () => { const result = await registerNfcDevice(device); setMessage(result.message); if (result.secret) setDeviceToken(result.secret); }}>Generate one-time device token</button>{deviceToken ? <div className="suite-subcard p-4"><p className="text-xs text-[var(--muted)]">Shown once. Provision this as the bridge bearer token.</p><code className="mt-2 block break-all text-xs text-[var(--accent)]">{deviceToken}</code></div> : null}{message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}</div></div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="suite-card p-6"><div className="flex items-end justify-between gap-3"><div><span className="suite-eyebrow">Physical access</span><h2 className="mt-4 text-2xl font-semibold">NFC bridge fleet</h2></div><a className="suite-button suite-button-secondary" href="/api/integrations/accounting/export">Export ledger CSV</a></div><div className="mt-5 grid gap-3">{state.nfcDevices.map((item) => <article key={item.id} className="suite-subcard p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{item.name}</p><p className="mt-2 text-xs text-[var(--muted)]">{item.deviceCode} · {item.location}</p></div><StatusBadge value={item.status} /></div><p className="mt-3 text-xs text-[var(--muted)]">{item.pendingCommands} pending · Heartbeat {item.lastHeartbeat ?? "never"}</p></article>)}</div></div>
        <div className="suite-card p-6"><span className="suite-eyebrow">Sync ledger</span><h2 className="mt-4 text-2xl font-semibold">Recent external activity</h2><div className="mt-5 grid gap-3">{state.integrationSyncs.slice(0, 20).map((sync) => <article key={sync.id} className="suite-subcard grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center"><div><p className="font-medium">{sync.provider} · {sync.operation.replaceAll("_", " ")}</p><p className="mt-2 font-mono text-xs text-[var(--muted)]">{sync.externalId} · {sync.direction} · {sync.createdAt}</p>{sync.error ? <p className="mt-2 text-xs text-red-300">{sync.error}</p> : null}</div><StatusBadge value={sync.status} /></article>)}</div></div>
      </section>
    </AppShell>
  );
}
