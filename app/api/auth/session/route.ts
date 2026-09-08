import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { UserDocument } from "@/lib/users";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ user: null });

  try {
    const db = await getDb();
    const user = await db.collection<UserDocument>("users").findOne(
      { id: userId },
      { projection: { _id: 0, passwordHash: 0 } },
    );
    return NextResponse.json({ user: user ?? null });
  } catch {
    return NextResponse.json({ error: "No se pudo comprobar la sesión." }, { status: 503 });
  }
}
