import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { applyStudyProgressOperation, getMissionStatus, getSafeClientReferenceDate, isFailedProgressMission, isProgressMission, type Mission, type StudyProgressOperation } from "@/lib/missions";
import { studyProgressOperationSchema } from "@/lib/validation";

type MissionDocument = Mission & {
  userId: string;
  createdAt: string;
  updatedAt: string;
  progressOperations?: StudyProgressOperation[];
};

const normalizeMission = (document: MissionDocument, referenceDate: Date): MissionDocument => {
  const status = getMissionStatus(document, referenceDate);
  return { ...document, status, completed: status === "completed" };
};

const toSafeMission = (document: MissionDocument) => {
  const { userId, progressOperations, ...mission } = document;
  void userId;
  void progressOperations;
  return mission;
};

export async function POST(request: Request, { params }: { params: Promise<{ missionId: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = studyProgressOperationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La sesión de estudio contiene datos inválidos." }, { status: 400 });

  const { missionId } = await params;
  const db = await getDb();
  const collection = db.collection<MissionDocument>("missions");
  const serverDate = new Date();
  const referenceDate = getSafeClientReferenceDate(parsed.data.date, serverDate);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing = await collection.findOne({ userId, id: missionId }, { projection: { _id: 0 } });
    if (!existing) return NextResponse.json({ error: "Misión no encontrada." }, { status: 404 });
    if (!isProgressMission(existing)) return NextResponse.json({ error: "Esta tarea no admite tiempo de estudio." }, { status: 409 });

    const previousOperation = existing.progressOperations?.find((operation) => operation.id === parsed.data.operationId);
    if (previousOperation) {
      return NextResponse.json({
        mission: toSafeMission(normalizeMission(existing, referenceDate)),
        addedMinutes: previousOperation.minutes,
      });
    }
    if (isFailedProgressMission(existing, referenceDate)) {
      return NextResponse.json({ error: "Este trabajo venció incompleto y ya no admite tiempo nuevo." }, { status: 409 });
    }
    if ((existing.progressEntries?.length ?? 0) >= 2000 || (existing.progressOperations?.length ?? 0) >= 2000) {
      return NextResponse.json({ error: "El historial de esta tarea alcanzó su límite." }, { status: 409 });
    }

    const applied = applyStudyProgressOperation(
      existing,
      parsed.data.minutes,
      parsed.data.operationId,
      referenceDate,
      existing.progressOperations,
    );
    const updatedAt = new Date().toISOString();
    const normalized = normalizeMission({
      ...existing,
      ...applied.mission,
      progressOperations: applied.operations,
      updatedAt,
    }, referenceDate);
    const result = await collection.updateOne(
      { userId, id: missionId, updatedAt: existing.updatedAt, "progressOperations.id": { $ne: parsed.data.operationId } },
      { $set: {
        progressCompletedMinutes: normalized.progressCompletedMinutes,
        progressEntries: normalized.progressEntries,
        progressOperations: normalized.progressOperations,
        completed: normalized.completed,
        status: normalized.status,
        updatedAt,
      } },
    );
    if (result.modifiedCount) {
      return NextResponse.json({ mission: toSafeMission(normalized), addedMinutes: applied.addedMinutes });
    }
  }

  return NextResponse.json({ error: "El progreso cambió mientras se guardaba. Vuelve a finalizar el cronómetro." }, { status: 409 });
}
