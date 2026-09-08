import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function DELETE(_request: Request, { params }: { params: Promise<{ subjectId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const { subjectId } = await params;
  const db = await getDb();
  const [missionUses, weeklyUses] = await Promise.all([
    db.collection("missions").countDocuments({ userId, subjectId }),
    db.collection("weeklyQuests").countDocuments({ userId, "dailyMissions.subjectId": subjectId }),
  ]);
  if (missionUses || weeklyUses) return NextResponse.json({ error: "Esta materia está en uso. Cambia primero las misiones y clases que la utilizan." }, { status: 409 });
  const result = await db.collection("subjects").deleteOne({ userId, id: subjectId });
  if (!result.deletedCount) return NextResponse.json({ error: "Materia no encontrada." }, { status: 404 });
  return NextResponse.json({ success: true });
}
