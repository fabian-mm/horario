import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import {
  defaultMissionTypes,
  MissionType,
  normalizeMissionTypeName,
} from "@/lib/mission-types";
import { missionTypeSchema } from "@/lib/validation";

type MissionTypeDocument = MissionType & {
  userId: string;
  normalizedName: string;
  createdAt: string;
  updatedAt: string;
};

const safeMissionType = ({
  userId: _,
  normalizedName: __,
  ...missionType
}: MissionTypeDocument) => missionType;

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const db = await getDb();
  const collection = db.collection<MissionTypeDocument>("missionTypes");
  const existingCatalog = await collection.find({ userId }).toArray();
  const existingIds = new Set(existingCatalog.map((type) => type.id));
  const existingNames = new Set(existingCatalog.map((type) => normalizeMissionTypeName(type.name)));
  const now = new Date().toISOString();
  await Promise.all(
    defaultMissionTypes.filter((missionType) => !existingIds.has(missionType.id) && !existingNames.has(normalizeMissionTypeName(missionType.name))).map((missionType) =>
      collection.updateOne(
        { userId, id: missionType.id },
        { $setOnInsert: { ...missionType, aliases: [], userId, normalizedName: normalizeMissionTypeName(missionType.name), createdAt: now, updatedAt: now } },
        { upsert: true },
      ),
    ),
  );
  const missionTypes = await collection
    .find({ userId })
    .sort({ createdAt: 1, name: 1 })
    .toArray();
  return NextResponse.json(missionTypes.map(safeMissionType));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const parsed = missionTypeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "El tipo de misión contiene datos inválidos.",
      },
      { status: 400 },
    );
  const db = await getDb();
  const collection = db.collection<MissionTypeDocument>("missionTypes");
  const normalizedName = normalizeMissionTypeName(parsed.data.name);
  const catalog = await collection
    .find({ userId, id: { $ne: parsed.data.id } })
    .toArray();
  const duplicate = catalog.find(
    (missionType) =>
      normalizeMissionTypeName(missionType.name) === normalizedName ||
      missionType.aliases?.some(
        (alias) => normalizeMissionTypeName(alias) === normalizedName,
      ),
  );
  if (duplicate)
    return NextResponse.json(
      { error: "Ya existe un tipo de misión con ese nombre." },
      { status: 409 },
    );

  const existing = await collection.findOne({ userId, id: parsed.data.id });
  const now = new Date().toISOString();
  const aliases =
    existing && existing.name !== parsed.data.name
      ? Array.from(new Set([...(existing.aliases ?? []), existing.name]))
      : existing?.aliases ?? [];

  await collection.updateOne(
    { userId, id: parsed.data.id },
    {
      $set: { name: parsed.data.name, normalizedName, aliases, updatedAt: now },
      $setOnInsert: { userId, id: parsed.data.id, createdAt: now },
    },
    { upsert: true },
  );

  // Keep the objective title independent from its editable template name.
  if (existing && existing.name !== parsed.data.name) {
    await db.collection("missions").updateMany(
      {
        userId,
        title: existing.name,
        missionTypeId: { $exists: false },
      },
      {
        $set: {
          missionTypeId: parsed.data.id,
        },
      },
    );
  }

  const saved = await collection.findOne({ userId, id: parsed.data.id });
  return NextResponse.json(saved ? safeMissionType(saved) : null);
}
