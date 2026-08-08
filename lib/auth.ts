import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "bitacora-session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

const sessionKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET es obligatorio en producción.");
  }
  return new TextEncoder().encode(secret ?? "bitacora-development-secret-change-me");
};

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(sessionKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getSessionUserId() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  (await cookies()).delete(COOKIE_NAME);
}
