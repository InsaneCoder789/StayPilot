"use client";

import { useState } from "react";

import { CustomSelect } from "@/components/custom-select";
import { useHotel } from "@/components/hotel-provider";
import { SuiteIcon } from "@/components/suite-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { state, hasUsers, login, bootstrapOwner } = useHotel();
  const [mode, setMode] = useState<"login" | "setup">(
    hasUsers ? "login" : "setup",
  );
  const [message, setMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [setupForm, setSetupForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  return (
    <main className="relative min-h-[100dvh] overflow-hidden px-4 py-6 text-[var(--foreground)] sm:px-6 lg:p-8">
      <div className="pointer-events-none absolute -right-36 -top-52 h-[36rem] w-[36rem] rounded-full bg-[rgba(224,183,104,.08)] blur-[120px]" />
      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-[96rem] overflow-hidden rounded-[2.4rem] border border-[var(--line)] bg-[rgba(15,16,14,.78)] shadow-[0_50px_160px_rgba(4,4,3,.34)] lg:grid-cols-[minmax(0,1.18fr)_minmax(25rem,.82fr)]">
        <section className="relative flex min-h-[36rem] flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(114,183,151,.09),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(224,183,104,.12),transparent_32%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="suite-brand-mark">S</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
                  StayPilot
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-[-0.04em]">Hotel OS</p>
              </div>
            </div>

            <div className="mt-20 max-w-3xl lg:mt-32">
              <span className="suite-eyebrow">Private property system</span>
              <h1 className="mt-6 text-[clamp(3.5rem,8vw,8.5rem)] font-semibold leading-[0.82] tracking-[-0.085em] text-balance">
                Run the entire hotel from here.
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-[var(--muted)]">
                Reservations, rooms, guest folios, payments, receipts, access credentials,
                housekeeping, engineering, inventory, floor plans, and night audit under one
                property-controlled system.
              </p>
            </div>
          </div>

          <div className="relative mt-16 grid gap-3 sm:grid-cols-3">
            {[
              ["20", "floors mapped"],
              [String(state.rooms.length), "rooms configured"],
              ["01", "private control plane"],
            ].map(([value, label]) => (
              <div key={label} className="suite-subcard p-4">
                <p className="font-mono text-2xl font-semibold text-[var(--accent)] tabular-nums">
                  {value}
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center border-t border-[var(--line)] bg-[rgba(255,255,255,.018)] p-5 sm:p-8 lg:border-l lg:border-t-0 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted-dim)]">
              Secure access
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">
              {mode === "login" ? "Welcome back." : "Create the owner."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {mode === "login"
                ? "Use your authorized property account to enter operations."
                : "The first account controls users, roles, finance, and property configuration."}
            </p>

            <div className="mt-8">
              <CustomSelect
                value={mode}
                onChange={(value) => setMode(value as "login" | "setup")}
                options={
                  !hasUsers
                    ? [{ value: "setup", label: "Create owner account" }]
                    : [
                        { value: "login", label: "Sign in" },
                        { value: "setup", label: "Owner setup" },
                      ]
                }
              />
            </div>

            {mode === "login" && hasUsers ? (
              <form
                className="mt-6 grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setMessage((await login(loginForm.email, loginForm.password)).message);
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="login-email">Email address</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={loginForm.email}
                    onChange={(event) =>
                      setLoginForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="you@hotel.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Enter password"
                  />
                </div>
                <Button type="submit" size="lg" className="mt-2 w-full">
                  Enter hotel operations
                  <SuiteIcon name="arrow" />
                </Button>
              </form>
            ) : (
              <form
                className="mt-6 grid gap-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setMessage((await bootstrapOwner(setupForm)).message);
                }}
              >
                <div className="grid gap-2">
                  <Label htmlFor="owner-name">Owner name</Label>
                  <Input
                    id="owner-name"
                    required
                    value={setupForm.name}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Full name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="owner-email">Owner email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    required
                    value={setupForm.email}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="owner@hotel.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="owner-password">Password</Label>
                  <Input
                    id="owner-password"
                    type="password"
                    required
                    minLength={8}
                    value={setupForm.password}
                    onChange={(event) =>
                      setSetupForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Minimum 8 characters"
                  />
                </div>
                <Button type="submit" size="lg" className="mt-2 w-full">
                  Create private workspace
                  <SuiteIcon name="arrow" />
                </Button>
              </form>
            )}

            {message ? (
              <Alert className="mt-5"><AlertDescription>{message}</AlertDescription></Alert>
            ) : null}

            <p className="mt-8 text-xs leading-5 text-[var(--muted-dim)]">
              Property data remains inside this deployment. External card settlement requires
              a connected, compliant payment processor.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
