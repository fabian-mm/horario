import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { defaultPlanning, planningPatchSchema, type Planning } from "@/lib/planning";

type Document = Planning & { _id: string };
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const db = await getDb();
  const saved = await db.collection<Document>("planning").findOne({ _id: userId });
  return NextResponse.json({ availability: saved?.availability ?? defaultPlanning.availability, dailyFocus: saved?.dailyFocus ?? null, concentration: saved?.concentration ?? defaultPlanning.concentration });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = planningPatchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa los horarios, duraciones y el máximo de tres prioridades." }, { status: 400 });
  const db = await getDb();
  if (parsed.data.dailyFocus?.missionIds.length) {
    const ids = parsed.data.dailyFocus.missionIds;
    const count = await db.collection("missions").countDocuments({ userId, id: { $in: ids } });
    if (count !== ids.length) return NextResponse.json({ error: "Alguna de las tareas ya no está disponible." }, { status: 400 });
  }
  await db.collection<Document>("planning").updateOne({ _id: userId }, { $set: parsed.data }, { upsert: true });
  return NextResponse.json(parsed.data);
}
