import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { isFailedProgressMission, type Mission } from "@/lib/missions";

export async function DELETE(_request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const { missionId } = await params;
  const db = await getDb();
  const mission = await db.collection<Mission & { userId: string }>("missions").findOne({ userId, id: missionId });
  if (mission && isFailedProgressMission(mission)) {
    return NextResponse.json({ error: "Este trabajo venció incompleto y ya no se puede eliminar." }, { status: 409 });
  }
  const result = await db.collection("missions").deleteOne({ userId, id: missionId });
  if (!result.deletedCount) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
  return NextResponse.json({ success: true });
}
