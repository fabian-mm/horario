import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function DELETE(_request: Request, { params }: { params: Promise<{ weeklyQuestId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const { weeklyQuestId } = await params;
  const db = await getDb();
  const result = await db.collection("weeklyQuests").deleteOne({ userId, id: weeklyQuestId });
  if (!result.deletedCount) return NextResponse.json({ error: "Misión semanal no encontrada." }, { status: 404 });
  return NextResponse.json({ success: true });
}
