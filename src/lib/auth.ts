import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";

import { getDb } from "@/lib/db";
export { hashPassword, verifyPassword } from "@/lib/security/password";

export const SESSION_COOKIE = "staypilot_session";
const SESSION_DAYS = 14;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, hotelId: string) {
  const db = getDb();
  const token = randomBytes(32).toString("base64url");
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({
    data: {
      userId,
      hotelId,
      tokenHash: tokenHash(token),
      expiresAt,
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: true, hotel: true },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    session.user.status !== "ACTIVE"
  ) {
    return null;
  }
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function revokeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await getDb().session.updateMany({
      where: { tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}
