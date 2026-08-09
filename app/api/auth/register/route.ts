import { hash } from "bcryptjs";
import { MongoServerError } from "mongodb";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getDatabaseErrorMessage, getDb, getPublicDatabaseIssue, logDatabaseError } from "@/lib/mongodb";
import { registerSchema } from "@/lib/validation";
import type { AppUser, UserDocument } from "@/lib/users";
import { checkRateLimit, getRequestAddress, rateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`register:${getRequestAddress(request)}`, 5, 60 * 60 * 1000);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Se alcanzó el límite temporal de registros. Intenta más tarde." }, { status: 429, headers: rateLimitHeaders(rateLimit) });
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const user: UserDocument = {
    id: crypto.randomUUID(),
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hash(parsed.data.password, 12),
    subtitle: "Explorador del semestre",
    createdAt: now,
    updatedAt: now,
  };

  try {
    const db = await getDb();
    await db.collection<UserDocument>("users").insertOne(user);
    await createSession(user.id);
    const { passwordHash: _, ...safeUser } = user;
    return NextResponse.json({ user: safeUser satisfies AppUser }, { status: 201 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese correo." }, { status: 409 });
    }
    logDatabaseError("auth.register", error);
    const issue = getPublicDatabaseIssue(error);
    return NextResponse.json({ error: getDatabaseErrorMessage(error), ...(issue ? { issue } : {}) }, { status: 503 });
  }
}
