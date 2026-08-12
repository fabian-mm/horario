import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import type { Mission } from "@/lib/missions";
import { missionSchema } from "@/lib/validation";

type MissionDocument = Mission & { userId: string; createdAt: string; updatedAt: string };

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  try {
    const db = await getDb();
    const missions = await db.collection<MissionDocument>("missions")
      .find({ userId })
      .project({ _id: 0, userId: 0 })
      .sort({ date: 1, time: 1 })
      .toArray();
    
    return NextResponse.json(missions, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("[api/missions/GET]", error);
    return NextResponse.json({ error: "No se pudieron cargar las misiones." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  
  try {
    const parsed = missionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "La misión contiene datos inválidos." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const mission = {
      ...parsed.data,
      completed: parsed.data.status === "completed" || parsed.data.completed,
      userId,
      updatedAt: now,
    };
    const db = await getDb();
    await db.collection<MissionDocument>("missions").updateOne(
      { userId, id: mission.id },
      { $set: mission, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
    const { userId: _, ...safeMission } = mission;
    return NextResponse.json(safeMission, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
      },
    });
  } catch (error) {
    console.error("[api/missions/POST]", error);
    return NextResponse.json({ error: "No se pudo guardar la misión." }, { status: 500 });
  }
}
