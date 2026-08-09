import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ missionTypeId: string }> },
) {
  const userId = await getSessionUserId();
  if (!userId)
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  const { missionTypeId } = await params;
  const db = await getDb();
  const [usage, total] = await Promise.all([
    db
      .collection("missions")
      .countDocuments({ userId, missionTypeId }),
    db.collection("missionTypes").countDocuments({ userId }),
  ]);
  if (usage)
    return NextResponse.json(
      { error: "Este tipo está siendo usado por misiones existentes." },
      { status: 409 },
    );
  if (total <= 1)
    return NextResponse.json(
      { error: "Debes conservar al menos un tipo de misión." },
      { status: 409 },
    );
  const result = await db
    .collection("missionTypes")
    .deleteOne({ userId, id: missionTypeId });
  if (!result.deletedCount)
    return NextResponse.json(
      { error: "Tipo de misión no encontrado." },
      { status: 404 },
    );
  return NextResponse.json({ success: true });
}
