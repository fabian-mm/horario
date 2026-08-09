import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { ensureSubjectCatalogMigration } from "@/lib/data-migrations";
import { getDb } from "@/lib/mongodb";
import { normalizeSubjectName, Subject } from "@/lib/subjects";
import { subjectSchema } from "@/lib/validation";

type SubjectDocument = Subject & { userId: string; normalizedName: string; createdAt: string; updatedAt: string };

const safeSubject = ({ userId: _, normalizedName: __, ...subject }: SubjectDocument) => subject;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const db = await getDb();
  await ensureSubjectCatalogMigration(db, userId);
  const subjects = await db.collection<SubjectDocument>("subjects").find({ userId }).sort({ name: 1 }).toArray();
  return NextResponse.json(subjects.map(safeSubject));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = subjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "La materia contiene datos inválidos." }, { status: 400 });
  const db = await getDb();
  const normalizedName = normalizeSubjectName(parsed.data.name);
  const catalog = await db.collection<SubjectDocument>("subjects").find({ userId, id: { $ne: parsed.data.id } }).toArray();
  const duplicate = catalog.find((subject) => normalizeSubjectName(subject.name) === normalizedName || subject.aliases?.some((alias) => normalizeSubjectName(alias) === normalizedName));
  if (duplicate) return NextResponse.json({ error: "Ya existe una materia con ese nombre." }, { status: 409 });

  const existing = await db.collection<SubjectDocument>("subjects").findOne({ userId, id: parsed.data.id });
  const now = new Date().toISOString();
  const aliases = existing && existing.name !== parsed.data.name ? Array.from(new Set([...(existing.aliases ?? []), existing.name])) : existing?.aliases ?? [];
  await db.collection<SubjectDocument>("subjects").updateOne(
    { userId, id: parsed.data.id },
    { $set: { name: parsed.data.name, normalizedName, aliases, updatedAt: now }, $setOnInsert: { userId, id: parsed.data.id, createdAt: now } },
    { upsert: true },
  );

  if (existing && existing.name !== parsed.data.name) {
    await Promise.all([
      db.collection("missions").updateMany({ userId, subjectId: parsed.data.id }, { $set: { subject: parsed.data.name } }),
      db.collection("missions").updateMany({ userId, subject: existing.name }, { $set: { subjectId: parsed.data.id, subject: parsed.data.name } }),
      db.collection("weeklyQuests").updateMany(
        { userId, "dailyMissions.subjectId": parsed.data.id },
        { $set: { "dailyMissions.$[daily].subject": parsed.data.name } },
        { arrayFilters: [{ "daily.subjectId": parsed.data.id }] },
      ),
      db.collection("weeklyQuests").updateMany(
        { userId, "dailyMissions.subject": existing.name },
        { $set: { "dailyMissions.$[daily].subjectId": parsed.data.id, "dailyMissions.$[daily].subject": parsed.data.name } },
        { arrayFilters: [{ "daily.subject": existing.name }] },
      ),
    ]);
  }
  const saved = await db.collection<SubjectDocument>("subjects").findOne({ userId, id: parsed.data.id });
  return NextResponse.json(saved ? safeSubject(saved) : null);
}
