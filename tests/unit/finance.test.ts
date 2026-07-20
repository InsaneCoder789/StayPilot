import { describe, expect, it } from "vitest";

import { applyPayment, applyRefund, calculateTax, fromMinorUnits, invoicePaymentState, toMinorUnits } from "@/domain/finance";

describe("finance domain", () => {
  it("converts currency without floating-point drift", () => {
    expect(toMinorUnits(10.005)).toBe(1001);
    expect(fromMinorUnits(1001)).toBe(10.01);
    expect(() => toMinorUnits(Number.NaN)).toThrow("Amount must be finite");
    expect(() => fromMinorUnits(10.5)).toThrow("safe integer");
  });

  it("calculates rounded tax", () => {
    expect(calculateTax(199.99, 5)).toBe(10);
    expect(() => calculateTax(-1, 5)).toThrow("cannot be negative");
  });

  it("caps capture at the open balance", () => {
    expect(applyPayment(100, 30, 90)).toEqual({ captured: 70, paid: 100, balance: 0, status: "PAID" });
  });

  it("tracks partial payment state", () => {
    expect(applyPayment(100, 0, 25)).toEqual({ captured: 25, paid: 25, balance: 75, status: "PARTIAL" });
    expect(invoicePaymentState(100, 0)).toBe("UNPAID");
  });

  it("reopens the correct balance after refund", () => {
    expect(applyRefund(100, 100, 40)).toEqual({ paid: 60, balance: 40, status: "PARTIAL" });
    expect(() => applyRefund(100, 20, 30)).toThrow("Refund exceeds");
  });
});
