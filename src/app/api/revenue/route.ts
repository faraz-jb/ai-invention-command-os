import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import type { RevenueSource } from "@/lib/types";

const SOURCES = ["stripe", "gumroad", "adsense", "manual"];

export async function GET() {
  const db = getDb();
  const revenue = db.prepare("SELECT * FROM revenue ORDER BY date DESC").all();
  return NextResponse.json({ revenue });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.amount !== "number" || typeof body.source !== "string") {
    return NextResponse.json({ error: "source and amount are required" }, { status: 400 });
  }
  if (!SOURCES.includes(body.source)) {
    return NextResponse.json({ error: "invalid source" }, { status: 400 });
  }

  const db = getDb();
  const entry = {
    id: makeId("rev"),
    source: body.source as RevenueSource,
    amount: body.amount,
    currency: body.currency ? String(body.currency) : "USD",
    date: body.date ? String(body.date) : new Date().toISOString(),
    description: body.description ? String(body.description) : "",
  };

  db.prepare(`
    INSERT INTO revenue (id, source, amount, currency, date, description)
    VALUES (@id, @source, @amount, @currency, @date, @description)
  `).run(entry);

  return NextResponse.json({ revenue: entry }, { status: 201 });
}
