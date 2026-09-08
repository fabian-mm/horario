import { NextResponse } from "next/server";
import { getDatabaseIssue, getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json({ status: "unavailable", issue: getDatabaseIssue(error) }, { status: 503 });
  }
}
