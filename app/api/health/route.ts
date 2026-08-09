import { NextResponse } from "next/server";
import { getDb, getPublicDatabaseIssue } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const issue = getPublicDatabaseIssue(error);
    return NextResponse.json({ status: "unavailable", ...(issue ? { issue } : {}) }, { status: 503 });
  }
}
