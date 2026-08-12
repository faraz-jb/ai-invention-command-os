import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const crons = db.prepare("SELECT * FROM cron_jobs ORDER BY name ASC").all();
  return NextResponse.json({ crons });
}
