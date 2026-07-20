"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { initialHotelSnapshot, StaffRole } from "@/lib/hotel-data";

export default function SettingsPage() {
  const {
    state,
    currentUser,
    updateHotelSettings,
    addPolicy,
    resetHotelData,
    createInvitation,
    setUserStatus,
    revokeUserSessions,
    setupMfa,
    enableMfa,
    disableMfa,
    logout,
    properties,
    currentPropertyId,
    createProperty,
    switchProperty,
  } = useHotel();
  const [hotel, setHotel] = useState(state.hotel);
  const [policy, setPolicy] = useState({
    title: "",
    category: "",
    content: "",
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "RECEPTIONIST" as StaffRole,
  });
  const [userMessage, setUserMessage] = useState("");
  const [invitationUrl, setInvitationUrl] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [securityPassword, setSecurityPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [propertyMessage, setPropertyMessage] = useState("");
  const [propertyForm, setPropertyForm] = useState({ name: "", propertyCode: "", city: "", country: "", currency: "AED", floors: 20, roomsPerFloor: 5 });

  return (
    <AppShell
      activeHref="/settings"
      eyebrow="Settings"
      title="Hotel profile and policies"
      description="Manage property defaults, tax settings, and the operational policy base used across the system."
    >
      <section className="suite-card mb-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><span className="suite-eyebrow">Portfolio</span><h2 className="mt-3 text-2xl font-semibold">Property control</h2><p className="mt-2 text-sm text-muted-foreground">Switch hotels without leaving the operating suite, or provision a complete property with floors, rooms, blueprints, outlets, payments, and integrations.</p></div><p className="font-mono text-xs text-primary">{properties.length} accessible {properties.length === 1 ? "property" : "properties"}</p></div>
        <div className="mt-5 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_1fr_110px_130px_auto]">
          <input className="suite-input" placeholder="Property name" value={propertyForm.name} onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))} />
          <input className="suite-input" placeholder="Unique code" value={propertyForm.propertyCode} onChange={(event) => setPropertyForm((current) => ({ ...current, propertyCode: event.target.value.toUpperCase() }))} />
          <input className="suite-input" placeholder="City" value={propertyForm.city} onChange={(event) => setPropertyForm((current) => ({ ...current, city: event.target.value }))} />
          <input className="suite-input" placeholder="Country" value={propertyForm.country} onChange={(event) => setPropertyForm((current) => ({ ...current, country: event.target.value }))} />
          <input className="suite-input" placeholder="Currency" maxLength={3} value={propertyForm.currency} onChange={(event) => setPropertyForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
          <CustomSelect value={String(propertyForm.roomsPerFloor)} onChange={(value) => setPropertyForm((current) => ({ ...current, roomsPerFloor: Number(value) }))} options={[4, 5, 6].map((value) => ({ value: String(value), label: `${value} rooms/floor` }))} />
          <button className="suite-button suite-button-primary" onClick={async () => { const result = await createProperty(propertyForm); setPropertyMessage(result.message); if (result.ok) setPropertyForm((current) => ({ ...current, name: "", propertyCode: "", city: "", country: "" })); }}>Create property</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{properties.map((property) => <button key={property.id} type="button" onClick={() => property.id !== currentPropertyId && switchProperty(property.id)} className={property.id === currentPropertyId ? "suite-button suite-button-primary" : "suite-button suite-button-secondary"}>{property.name} · {property.propertyCode}</button>)}</div>
        {propertyMessage ? <p className="mt-3 text-sm text-muted-foreground">{propertyMessage}</p> : null}
      </section>
      <div className="grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Hotel settings
          </h3>
          <div className="mt-4 grid gap-3">
            <input
              value={hotel.hotelName}
              onChange={(event) =>
                setHotel((current) => ({ ...current, hotelName: event.target.value }))
              }
              className="suite-input"
            />
            <input
              value={hotel.location}
              onChange={(event) =>
                setHotel((current) => ({ ...current, location: event.target.value }))
              }
              className="suite-input"
            />
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={hotel.checkInTime}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    checkInTime: event.target.value,
                  }))
                }
                className="suite-input"
              />
              <input
                value={hotel.checkOutTime}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    checkOutTime: event.target.value,
                  }))
                }
                className="suite-input"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                type="number"
                value={hotel.taxRate}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    taxRate: Number(event.target.value),
                  }))
                }
                className="suite-input"
              />
              <input
                value={hotel.timezone}
                onChange={(event) =>
                  setHotel((current) => ({ ...current, timezone: event.target.value }))
                }
                className="suite-input"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                value={hotel.theme.accent}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    theme: { ...current.theme, accent: event.target.value },
                  }))
                }
                placeholder="Accent hex"
                className="suite-input"
              />
              <input
                value={hotel.theme.surface}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    theme: { ...current.theme, surface: event.target.value },
                  }))
                }
                placeholder="Surface"
                className="suite-input"
              />
              <input
                value={hotel.theme.surfaceStrong}
                onChange={(event) =>
                  setHotel((current) => ({
                    ...current,
                    theme: { ...current.theme, surfaceStrong: event.target.value },
                  }))
                }
                placeholder="Surface strong"
                className="suite-input"
              />
            </div>
          </div>
          <button
            onClick={() => updateHotelSettings(hotel)}
            className="suite-button suite-button-primary mt-4"
          >
            Save hotel settings
          </button>
          <button
            onClick={() => {
              resetHotelData();
              setHotel(initialHotelSnapshot.hotel);
            }}
            className="suite-button suite-button-secondary mt-3"
          >
            Reset operating data
          </button>
          <button
            onClick={logout}
            className="suite-button suite-button-secondary mt-3 ml-3"
          >
            Log out
          </button>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Policy library
          </h3>
          <div className="mt-4 grid gap-3">
            <input
              value={policy.title}
              onChange={(event) =>
                setPolicy((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Policy title"
              className="suite-input"
            />
            <input
              value={policy.category}
              onChange={(event) =>
                setPolicy((current) => ({ ...current, category: event.target.value }))
              }
              placeholder="Category"
              className="suite-input"
            />
            <textarea
              value={policy.content}
              onChange={(event) =>
                setPolicy((current) => ({ ...current, content: event.target.value }))
              }
              placeholder="Policy content"
              className="suite-input min-h-32"
            />
          </div>
          <button
            onClick={() => {
              addPolicy(policy);
              setPolicy({ title: "", category: "", content: "" });
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Add policy
          </button>

          <div className="mt-5 space-y-3">
            {state.policies.map((item) => (
              <div
                key={item.id}
                className="suite-subcard px-4 py-4"
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{item.category}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Access management
          </h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Signed in as {currentUser?.name ?? "Unknown"}.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={userForm.name}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Full name"
              className="suite-input"
            />
            <input
              value={userForm.email}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="Email"
              className="suite-input"
            />
            <CustomSelect
              value={userForm.role}
              onChange={(value) =>
                setUserForm((current) => ({ ...current, role: value as StaffRole }))
              }
              options={[
                "HOTEL_ADMIN",
                "MANAGER",
                "RECEPTIONIST",
                "HOUSEKEEPING",
                "MAINTENANCE",
                "ACCOUNTANT",
              ].map((role) => ({ value: role, label: role.replaceAll("_", " ") }))}
            />
          </div>
          <button
            onClick={async () => {
              const result = await createInvitation(userForm);
              setUserMessage(result.message);
              setInvitationUrl(result.invitationUrl ?? "");
              if (result.ok) {
                setUserForm({
                  name: "",
                  email: "",
                  role: "RECEPTIONIST",
                });
              }
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Create staff invitation
          </button>
          {userMessage ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{userMessage}</p>
          ) : null}
          {invitationUrl ? (
            <div className="suite-subcard mt-3 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Secure invitation link</p>
              <p className="mt-2 break-all font-mono text-xs text-[var(--ink-soft)]">{invitationUrl}</p>
            </div>
          ) : null}
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Authorized users
          </h3>
          <div className="mt-4 space-y-3">
            {state.users.map((user) => (
              <div key={user.id} className="suite-subcard px-4 py-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div><p className="font-medium">{user.name}</p><p className="mt-2 text-sm text-[var(--muted)]">{user.email} • {user.role.replaceAll("_", " ")} • {user.status ?? (user.active ? "ACTIVE" : "DISABLED")}{user.mfaEnabled ? " • MFA" : ""}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <button className="suite-button" onClick={async () => setUserMessage((await revokeUserSessions(user.id)).message)}>Revoke sessions</button>
                    {user.id !== currentUser?.id ? <button className="suite-button" onClick={async () => setUserMessage((await setUserStatus(user.id, user.active ? "DISABLED" : "ACTIVE")).message)}>{user.active ? "Disable" : "Enable"}</button> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="suite-card mt-4 p-6">
        <h3 className="text-2xl font-semibold tracking-[-0.03em]">Account security</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Protect your account with a time-based authenticator. Enabling MFA revokes every other active session.</p>
        {!currentUser?.mfaEnabled ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_12rem_auto]">
            <div className="suite-subcard p-4"><p className="text-xs text-[var(--muted)]">Authenticator secret</p><p className="mt-2 break-all font-mono text-sm">{mfaSecret || "Start setup to generate a secret."}</p></div>
            <input className="suite-input" inputMode="numeric" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" />
            <div className="flex gap-2"><button className="suite-button" onClick={async () => { const result = await setupMfa(); setMfaSecret(result.secret ?? ""); setSecurityMessage(result.message); }}>Start MFA</button><button className="suite-button suite-button-primary" disabled={!mfaSecret || mfaCode.length !== 6} onClick={async () => setSecurityMessage((await enableMfa(mfaCode)).message)}>Enable</button></div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 md:flex-row"><input className="suite-input flex-1" type="password" value={securityPassword} onChange={(event) => setSecurityPassword(event.target.value)} placeholder="Confirm current password" /><button className="suite-button" onClick={async () => setSecurityMessage((await disableMfa(securityPassword)).message)}>Disable MFA</button></div>
        )}
        {securityMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{securityMessage}</p> : null}
      </section>

      <div className="mt-4 grid gap-4 2xl:grid-cols-[0.95fr_1.05fr]">
        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Integration readiness
          </h3>
          <div className="mt-4 space-y-3">
            {state.integrations.map((item) => (
              <div key={item.id} className="suite-subcard flex items-center justify-between px-4 py-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{item.type}</p>
                </div>
                <p className="text-sm text-[var(--ink-soft)]">
                  {item.enabled ? "Enabled" : item.status}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Audit log
          </h3>
          <div className="mt-4 space-y-3">
            {state.auditLogs.slice(0, 12).map((item) => (
              <div key={item.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{item.action.replaceAll("_", " ")}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {item.actor} • {item.createdAt}
                </p>
                <p className="mt-2 text-sm text-[var(--ink-soft)]">{item.target}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
