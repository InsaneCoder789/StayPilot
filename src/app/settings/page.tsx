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
    createUser,
    logout,
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
    password: "",
    role: "RECEPTIONIST" as StaffRole,
  });
  const [userMessage, setUserMessage] = useState("");

  return (
    <AppShell
      activeHref="/settings"
      eyebrow="Settings"
      title="Hotel profile and policies"
      description="Manage property defaults, tax settings, and the operational policy base used across the system."
    >
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
            <input
              type="password"
              value={userForm.password}
              onChange={(event) =>
                setUserForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="Password"
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
              const result = await createUser(userForm);
              setUserMessage(result.message);
              if (result.ok) {
                setUserForm({
                  name: "",
                  email: "",
                  password: "",
                  role: "RECEPTIONIST",
                });
              }
            }}
            className="suite-button suite-button-primary mt-4"
          >
            Add authorized user
          </button>
          {userMessage ? (
            <p className="mt-3 text-sm text-[var(--muted)]">{userMessage}</p>
          ) : null}
        </section>

        <section className="suite-card p-6">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">
            Authorized users
          </h3>
          <div className="mt-4 space-y-3">
            {state.users.map((user) => (
              <div key={user.id} className="suite-subcard px-4 py-4">
                <p className="font-medium">{user.name}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {user.email} • {user.role.replaceAll("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

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
