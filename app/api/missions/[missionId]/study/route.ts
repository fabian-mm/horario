import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Mission } from "@/lib/missions";

const studySchema = z.object({ id: z.string().min(1).max(220), minutes: z.number().int().min(1).max(60000), finishedAt: z.string().datetime() });
type StudyMission = Mission & { userId: string; studySessions?: z.infer<typeof studySchema>[] };

export async function POST(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = studySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La sesión contiene datos inválidos." }, { status: 400 });
  const { missionId } = await params;
  const db = await getDb();
  const collection = db.collection<StudyMission>("missions");
  // The condition and increment run atomically on the same document. Retrying the
  // persisted session ID cannot add its minutes again, even from another tab.
  await collection.updateOne(
    { userId, id: missionId, "studySessions.id": { $ne: parsed.data.id } },
    { $push: { studySessions: parsed.data }, $inc: { studiedMinutes: parsed.data.minutes }, $set: { updatedAt: new Date().toISOString() } },
  );
  const saved = await collection.findOne({ userId, id: missionId }, { projection: { _id: 0, studiedMinutes: 1 } });
  if (!saved) return NextResponse.json({ error: "La tarea ya no existe. El cronómetro se conserva en este navegador." }, { status: 404 });
  return NextResponse.json({ studiedMinutes: saved.studiedMinutes ?? 0 });
}
