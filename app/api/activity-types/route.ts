import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { ensureActivityTypeLinksMigration } from "@/lib/data-migrations";
import { getDb } from "@/lib/mongodb";
import { ActivityType, defaultActivityTypes, normalizeActivityTypeName } from "@/lib/activity-types";
import { activityTypeSchema } from "@/lib/validation";

type ActivityTypeDocument = ActivityType & { userId: string; normalizedName: string; createdAt: string; updatedAt: string };
const safeActivityType = ({ userId: _, normalizedName: __, ...activityType }: ActivityTypeDocument) => activityType;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const db = await getDb();
  const collection = db.collection<ActivityTypeDocument>("activityTypes");
  const existingCatalog = await collection.find({ userId }).toArray();
  const existingIds = new Set(existingCatalog.map((type) => type.id));
  const existingNames = new Set(existingCatalog.map((type) => normalizeActivityTypeName(type.name)));
  const now = new Date().toISOString();
  await Promise.all(defaultActivityTypes
    .filter((type) => !existingIds.has(type.id) && !existingNames.has(normalizeActivityTypeName(type.name)))
    .map((activityType) => collection.updateOne(
      { userId, id: activityType.id },
      { $setOnInsert: { ...activityType, aliases: [], userId, normalizedName: normalizeActivityTypeName(activityType.name), createdAt: now, updatedAt: now } },
      { upsert: true },
    )));
  const activityTypes = await collection.find({ userId }).sort({ createdAt: 1, name: 1 }).toArray();
  const classType = activityTypes.find((activityType) => activityType.category === "class") ?? activityTypes[0];
  await ensureActivityTypeLinksMigration(db, userId, classType);
  return NextResponse.json(activityTypes.map(safeActivityType));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = activityTypeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "El tipo de actividad contiene datos inválidos." }, { status: 400 });
  const db = await getDb();
  const collection = db.collection<ActivityTypeDocument>("activityTypes");
  const normalizedName = normalizeActivityTypeName(parsed.data.name);
  const catalog = await collection.find({ userId, id: { $ne: parsed.data.id } }).toArray();
  const duplicate = catalog.find((activityType) => normalizeActivityTypeName(activityType.name) === normalizedName || activityType.aliases?.some((alias) => normalizeActivityTypeName(alias) === normalizedName));
  if (duplicate) return NextResponse.json({ error: "Ya existe un tipo de actividad con ese nombre." }, { status: 409 });
  const existing = await collection.findOne({ userId, id: parsed.data.id });
  const now = new Date().toISOString();
  const aliases = existing && existing.name !== parsed.data.name ? Array.from(new Set([...(existing.aliases ?? []), existing.name])) : existing?.aliases ?? [];
  await collection.updateOne(
    { userId, id: parsed.data.id },
    { $set: { ...parsed.data, normalizedName, aliases, updatedAt: now }, $setOnInsert: { userId, createdAt: now } },
    { upsert: true },
  );
  await db.collection("weeklyQuests").updateMany(
    { userId, "dailyMissions.activityTypeId": parsed.data.id },
    { $set: {
      "dailyMissions.$[activity].activityTypeName": parsed.data.name,
      "dailyMissions.$[activity].activityCategory": parsed.data.category,
      "dailyMissions.$[activity].activityPoints": parsed.data.points,
    } },
    { arrayFilters: [{ "activity.activityTypeId": parsed.data.id }] },
  );
  const saved = await collection.findOne({ userId, id: parsed.data.id });
  return NextResponse.json(saved ? safeActivityType(saved) : null);
}
