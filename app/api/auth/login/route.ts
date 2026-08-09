import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { getDatabaseErrorMessage, getDb } from "@/lib/mongodb";
import { loginSchema } from "@/lib/validation";
import type { UserDocument } from "@/lib/users";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne({ email: parsed.data.email });
    if (!user || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    await createSession(user.id);
    const { _id, passwordHash, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return NextResponse.json({ error: getDatabaseErrorMessage(error) }, { status: 503 });
  }
}
