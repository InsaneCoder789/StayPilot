import { generate } from "otplib";
import { expect, request as apiRequest, test } from "@playwright/test";

import { getDb } from "@/lib/db";

test("fresh property presents secure owner setup", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Create the owner." })).toBeVisible();
  await expect(page.getByLabel("Owner name")).toBeVisible();
  await expect(page.getByRole("button", { name: /Create private workspace/ })).toBeVisible();
});

test("health endpoint reports database readiness", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({ status: "ready", database: "connected" });
});

test("identity lifecycle enforces lockout, reset, MFA, invitations, and sessions", async ({ request }) => {
  const ownerEmail = "e2e-owner@staypilot.invalid";
  const staffEmail = "e2e-staff@staypilot.invalid";
  const db = getDb();

  await db.loginAttempt.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
  await db.staffInvitation.deleteMany({ where: { email: staffEmail } });
  await db.user.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });

  try {
    expect((await request.get("/api/auth/sessions")).status()).toBe(401);
    const bootstrap = await request.post("/api/auth/bootstrap", { data: { name: "E2E Owner", email: ownerEmail, password: "StayPilot!Owner2026" } });
    expect(bootstrap.ok()).toBe(true);

    await request.post("/api/auth/logout");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "Incorrect!Password1" } });
      expect(failed.status()).toBe(401);
    }
    const locked = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "StayPilot!Owner2026" } });
    expect(locked.status()).toBe(429);

    const recovery = await request.post("/api/auth/password/request", { data: { email: ownerEmail } });
    const recoveryBody = await recovery.json() as { resetUrl: string };
    const resetToken = new URL(recoveryBody.resetUrl).searchParams.get("reset");
    expect(resetToken).toBeTruthy();
    const reset = await request.post("/api/auth/password/reset", { data: { token: resetToken, password: "StayPilot!Renewed2026" } });
    expect(reset.ok()).toBe(true);

    const login = await request.post("/api/auth/login", { data: { email: ownerEmail, password: "StayPilot!Renewed2026" } });
    expect(login.ok()).toBe(true);
    const mfaSetup = await request.post("/api/auth/mfa", { data: { action: "setup" } });
    const mfaBody = await mfaSetup.json() as { secret: string };
    const otp = await generate({ secret: mfaBody.secret });
    const mfaEnable = await request.post("/api/auth/mfa", { data: { action: "enable", otp } });
    expect(mfaEnable.ok()).toBe(true);

    const invitation = await request.post("/api/auth/invitations", { data: { name: "E2E Reception", email: staffEmail, role: "RECEPTIONIST" } });
    const invitationBody = await invitation.json() as { invitationUrl: string };
    const invitationToken = new URL(invitationBody.invitationUrl).searchParams.get("invite");
    const staffContext = await apiRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
    const accepted = await staffContext.post("/api/auth/invitations/accept", { data: { token: invitationToken, password: "StayPilot!Staff2026" } });
    expect(accepted.ok()).toBe(true);
    const staffSessions = await staffContext.get("/api/auth/sessions");
    await expect(staffSessions.json()).resolves.toMatchObject({ sessions: [{ deviceName: "Desktop browser" }] });
    await staffContext.dispose();
  } finally {
    await db.loginAttempt.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
    await db.staffInvitation.deleteMany({ where: { email: staffEmail } });
    await db.user.deleteMany({ where: { email: { in: [ownerEmail, staffEmail] } } });
    await db.$disconnect();
  }
});
