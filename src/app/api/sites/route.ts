import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const sites = db.prepare("SELECT * FROM sites ORDER BY name ASC").all();
  return NextResponse.json({ sites });
}
