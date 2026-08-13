import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getMissionStatus, getSafeClientReferenceDate, isFailedProgressMission, sortMissionsByDateTime, validateProgressUpdate, type Mission } from "@/lib/missions";
import { missionOptionalFields, missionSchema } from "@/lib/validation";

type MissionDocument = Mission & { userId: string; createdAt: string; updatedAt: string };

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const db = await getDb();
  const missions = await db.collection<MissionDocument>("missions")
    .find({ userId })
    .project({ _id: 0, userId: 0 })
    .sort({ date: 1, time: 1 })
    .toArray();
  const referenceDate = getSafeClientReferenceDate(request.headers.get("x-client-date"));
  return NextResponse.json(sortMissionsByDateTime((missions as unknown as Mission[]).map((mission) => {
    const status = getMissionStatus(mission, referenceDate);
    return { ...mission, status, completed: status === "completed" };
  })));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = missionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "La misión contiene datos inválidos." }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db.collection<MissionDocument>("missions").findOne({ userId, id: parsed.data.id });
  const serverDate = new Date();
  const referenceDate = getSafeClientReferenceDate(request.headers.get("x-client-date"), serverDate);
  const progressValidation = validateProgressUpdate(existing, parsed.data as Mission, serverDate);
  if (!progressValidation.valid) return NextResponse.json({ error: progressValidation.error }, { status: 409 });
  const updateReferenceDate = progressValidation.progressDate
    ? getSafeClientReferenceDate(progressValidation.progressDate, serverDate)
    : referenceDate;
  if (existing && isFailedProgressMission(existing, updateReferenceDate)) {
    return NextResponse.json({ error: "Este trabajo venció incompleto y ya no se puede modificar." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const progressComplete = Boolean(
    parsed.data.progressGoalMinutes &&
    (parsed.data.progressCompletedMinutes ?? 0) >= parsed.data.progressGoalMinutes,
  );
  const derivedStatus = getMissionStatus(parsed.data as Mission, referenceDate);
  const mission = {
    ...parsed.data,
    weight: parsed.data.progressGoalMinutes ? undefined : parsed.data.weight,
    completed: parsed.data.progressGoalMinutes
      ? progressComplete
      : parsed.data.status === "completed" || parsed.data.completed,
    status: parsed.data.progressGoalMinutes
      ? progressComplete ? "completed" as const : derivedStatus
      : parsed.data.status,
    userId,
    updatedAt: now,
  };
  const missionToStore = Object.fromEntries(
    Object.entries(mission).filter(([, value]) => value !== undefined),
  ) as Omit<MissionDocument, "createdAt">;
  const fieldsToUnset = Object.fromEntries(
    missionOptionalFields.filter((field) => mission[field] === undefined).map((field) => [field, "" as const]),
  ) as Record<string, "">;
  await db.collection<MissionDocument>("missions").updateOne(
    { userId, id: missionToStore.id },
    {
      $set: missionToStore,
      $setOnInsert: { createdAt: now },
      ...(Object.keys(fieldsToUnset).length ? { $unset: fieldsToUnset } : {}),
    },
    { upsert: true },
  );
  const { userId: _, ...safeMission } = missionToStore;
  return NextResponse.json(safeMission);
}
