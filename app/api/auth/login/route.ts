import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getDatabaseErrorMessage, getDb, getPublicDatabaseIssue, logDatabaseError } from "@/lib/mongodb";
import { loginSchema } from "@/lib/validation";
import type { UserDocument } from "@/lib/users";
import { checkRateLimit, getRequestAddress, rateLimitHeaders } from "@/lib/rate-limit";

const DUMMY_PASSWORD_HASH = "$2b$12$p8oM912.DYylALirnpBAsuiOrPBmZltUKafWmz.pHEP7jgmBiMhdi";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`login:${getRequestAddress(request)}`, 10, 15 * 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos antes de volver a intentar." }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne({ email: parsed.data.email });
    const passwordMatches = await compare(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    await createSession(user.id);
    const { _id, passwordHash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    logDatabaseError("auth.login", error);
    const issue = getPublicDatabaseIssue(error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error), ...(issue ? { issue } : {}) }, { status: 503 });
  }
}
