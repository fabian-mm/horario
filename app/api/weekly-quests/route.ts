import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { WeeklyQuest } from "@/lib/schedule";
import { weeklyQuestSchema } from "@/lib/validation";

type WeeklyQuestDocument = WeeklyQuest & { userId: string; createdAt: string; updatedAt: string };

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const db = await getDb();
  const weeklyQuests = await db.collection<WeeklyQuestDocument>("weeklyQuests")
    .find({ userId })
    .project({ _id: 0, userId: 0 })
    .sort({ createdAt: 1 })
    .toArray();
  return NextResponse.json(weeklyQuests);
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = weeklyQuestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "La misión semanal contiene datos inválidos." }, { status: 400 });

  const now = new Date().toISOString();
  const weeklyQuest = { ...parsed.data, userId, updatedAt: now };
  const db = await getDb();
  await db.collection<WeeklyQuestDocument>("weeklyQuests").updateOne(
    { userId, id: weeklyQuest.id },
    { $set: weeklyQuest, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  const { userId: _, ...safeWeeklyQuest } = weeklyQuest;
  return NextResponse.json(safeWeeklyQuest);
}
