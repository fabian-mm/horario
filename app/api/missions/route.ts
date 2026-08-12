import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getMissionStatus, isFailedProgressMission, sortMissionsByDateTime, validateProgressUpdate, type Mission } from "@/lib/missions";
import { missionSchema } from "@/lib/validation";

type MissionDocument = Mission & { userId: string; createdAt: string; updatedAt: string };

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const db = await getDb();
  const missions = await db.collection<MissionDocument>("missions")
    .find({ userId })
    .project({ _id: 0, userId: 0 })
    .sort({ date: 1, time: 1 })
    .toArray();
  return NextResponse.json(sortMissionsByDateTime((missions as unknown as Mission[]).map((mission) => ({
    ...mission,
    status: getMissionStatus(mission),
    completed: getMissionStatus(mission) === "completed",
  }))));
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
  if (existing && isFailedProgressMission(existing)) {
    return NextResponse.json({ error: "Este trabajo venció incompleto y ya no se puede modificar." }, { status: 409 });
  }
  const progressValidation = validateProgressUpdate(existing, parsed.data as Mission);
  if (!progressValidation.valid) return NextResponse.json({ error: progressValidation.error }, { status: 409 });
  const now = new Date().toISOString();
  const progressComplete = Boolean(
    parsed.data.progressGoalMinutes &&
    (parsed.data.progressCompletedMinutes ?? 0) >= parsed.data.progressGoalMinutes,
  );
  const derivedStatus = getMissionStatus(parsed.data as Mission);
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
  await db.collection<MissionDocument>("missions").updateOne(
    { userId, id: mission.id },
    { $set: mission, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  const { userId: _, ...safeMission } = mission;
  return NextResponse.json(safeMission);
}
