import { describe, expect, it } from "vitest";

import { passwordPolicyError } from "@/domain/password-policy";

describe("password policy", () => {
  it("accepts a long mixed password", () => {
    expect(passwordPolicyError("StayPilot!2026Secure")).toBeNull();
  });

  it("rejects weak password classes", () => {
    expect(passwordPolicyError("Short1!")).toContain("12 characters");
    expect(passwordPolicyError("lowercaseonly1!")).toContain("upper and lower");
    expect(passwordPolicyError("NoNumbersHere!")).toContain("number");
    expect(passwordPolicyError("NoSymbolsHere123")).toContain("symbol");
  });
});
