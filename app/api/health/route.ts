import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
