import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { UserDocument } from "@/lib/users";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  subtitle: z.string().trim().min(1).max(100).optional(),
  theme: z.enum(["guild", "rose", "ocean", "arcane", "ember"]).optional(),
}).refine((values) => Object.keys(values).length > 0, "No hay cambios para guardar.");

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos de cuenta inválidos." }, { status: 400 });

  const db = await getDb();
  const user = await db.collection<UserDocument>("users").findOneAndUpdate(
    { id: userId },
    { $set: { ...parsed.data, updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0, passwordHash: 0 } },
  );
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  return NextResponse.json({ user });
}
