import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySharedSignature(body: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const provided = signature.replace(/^sha256=/, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}
