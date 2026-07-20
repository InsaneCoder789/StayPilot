import "server-only";

import { cookies, headers } from "next/headers";

import { getDb } from "@/lib/db";
import { createOpaqueToken, hashToken } from "@/lib/security/tokens";
export { hashPassword, verifyPassword } from "@/lib/security/password";

export const SESSION_COOKIE = "staypilot_session";
const SESSION_DAYS = 14;

export async function createSession(userId: string, hotelId: string) {
  const db = getDb();
  const { token, tokenHash } = createOpaqueToken();
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({
    data: {
      userId,
      hotelId,
      tokenHash,
      expiresAt,
      userAgent,
      deviceName: userAgent?.includes("Mobile") ? "Mobile browser" : "Desktop browser",
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
    where: { tokenHash: hashToken(token) },
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
  await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
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
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  cookieStore.delete(SESSION_COOKIE);
}
