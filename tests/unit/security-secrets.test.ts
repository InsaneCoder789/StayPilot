import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret } from "@/lib/security/cipher";
import { createOpaqueToken, hashToken } from "@/lib/security/tokens";

describe("security secrets", () => {
  it("encrypts authenticated secrets and detects tampering", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
    expect(() => decryptSecret(`${encrypted}broken`)).toThrow();
  });

  it("creates opaque tokens and stores deterministic hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashToken(first.token));
    expect(first.tokenHash).toHaveLength(64);
  });
});
