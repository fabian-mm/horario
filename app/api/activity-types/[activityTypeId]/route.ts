import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function DELETE(_request: Request, { params }: { params: Promise<{ activityTypeId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const { activityTypeId } = await params;
  const db = await getDb();
  const [usage, total] = await Promise.all([
    db.collection("weeklyQuests").countDocuments({ userId, "dailyMissions.activityTypeId": activityTypeId }),
    db.collection("activityTypes").countDocuments({ userId }),
  ]);
  if (usage) return NextResponse.json({ error: "Este tipo está en uso dentro de tu horario." }, { status: 409 });
  if (total <= 1) return NextResponse.json({ error: "Debes conservar al menos un tipo de actividad." }, { status: 409 });
  const result = await db.collection("activityTypes").deleteOne({ userId, id: activityTypeId });
  if (!result.deletedCount) return NextResponse.json({ error: "Tipo de actividad no encontrado." }, { status: 404 });
  return NextResponse.json({ success: true });
}
