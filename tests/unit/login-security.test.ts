import { describe, expect, it } from "vitest";

import { failedLoginUpdate, isAccountLocked, LOCKOUT_MINUTES, MAX_LOGIN_FAILURES } from "@/domain/login-security";

describe("login security", () => {
  const now = new Date("2026-07-20T12:00:00.000Z");

  it("locks an account at the configured failure threshold", () => {
    const result = failedLoginUpdate(MAX_LOGIN_FAILURES - 1, now);
    expect(result.failedLoginAttempts).toBe(MAX_LOGIN_FAILURES);
    expect(result.lockedUntil?.getTime()).toBe(now.getTime() + LOCKOUT_MINUTES * 60_000);
  });

  it("does not lock before the failure threshold", () => {
    expect(failedLoginUpdate(1, now)).toEqual({ failedLoginAttempts: 2, lockedUntil: null });
  });

  it("recognizes only a lockout in the future", () => {
    expect(isAccountLocked(new Date(now.getTime() + 1), now)).toBe(true);
    expect(isAccountLocked(now, now)).toBe(false);
    expect(isAccountLocked(null, now)).toBe(false);
  });
});
