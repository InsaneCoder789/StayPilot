import "server-only";

import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/security/tokens";

export async function requireNfcDevice(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) throw new Error("DEVICE_UNAUTHORIZED");
  const device = await getDb().nfcDevice.findUnique({ where: { secretHash: hashToken(token) } });
  if (!device) throw new Error("DEVICE_UNAUTHORIZED");
  return device;
}
