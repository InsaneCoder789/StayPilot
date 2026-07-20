import { describe, expect, it } from "vitest";

import { normalizeBusinessDate, stayNights, staysOverlap } from "@/domain/reservations";

describe("reservation dates", () => {
  it("normalizes a hotel business date", () => {
    expect(normalizeBusinessDate("2026-07-20").toISOString()).toBe("2026-07-20T12:00:00.000Z");
    expect(normalizeBusinessDate(new Date("2026-07-20T22:30:00.000Z")).toISOString()).toBe("2026-07-20T12:00:00.000Z");
    expect(() => normalizeBusinessDate("not-a-date")).toThrow("Invalid business date");
  });

  it("counts stay nights", () => {
    expect(stayNights("2026-07-20", "2026-07-24")).toBe(4);
    expect(() => stayNights("2026-07-20", "2026-07-20")).toThrow("Checkout must be after check-in");
  });

  it("detects overlap but permits same-day turnover", () => {
    expect(staysOverlap(
      { checkIn: "2026-07-20", checkOut: "2026-07-23" },
      { checkIn: "2026-07-22", checkOut: "2026-07-24" },
    )).toBe(true);
    expect(staysOverlap(
      { checkIn: "2026-07-20", checkOut: "2026-07-23" },
      { checkIn: "2026-07-23", checkOut: "2026-07-25" },
    )).toBe(false);
  });
});
