import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import type { RevenueSource } from "@/lib/types";
import { getStripeRevenue } from "@/lib/stripe";

const SOURCES = ["stripe", "gumroad", "adsense", "manual"];

function monthRange(month: string | null): { start: string; end: string } {
  const now = new Date();
  const [year, mon] = month && /^\d{4}-\d{2}$/.test(month)
    ? month.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];
  const start = new Date(year, mon - 1, 1).toISOString();
  const end = new Date(year, mon, 1).toISOString();
  return { start, end };
}

export async function GET(req: NextRequest) {
  const db = getDb();
  const month = req.nextUrl.searchParams.get("month");
  const { start, end } = monthRange(month);

  const revenue = db
    .prepare("SELECT * FROM revenue WHERE date >= ? AND date < ? ORDER BY date DESC")
    .all(start, end) as { id: string; source: string; amount: number; currency: string; date: string; description: string }[];

  const stripeLive = await getStripeRevenue();
  const merged = stripeLive ? [...stripeLive, ...revenue] : revenue;

  const monthTotal = merged.reduce((sum, r) => sum + r.amount, 0);
  const bySource: Record<string, number> = {};
  for (const r of merged) {
    bySource[r.source] = (bySource[r.source] ?? 0) + r.amount;
  }

  const allTimeTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM revenue").get() as {
    total: number;
  };

  return NextResponse.json({
    revenue: merged,
    month: month ?? `${new Date(start).getFullYear()}-${String(new Date(start).getMonth() + 1).padStart(2, "0")}`,
    month_total: monthTotal,
    total_revenue: allTimeTotal.total + (stripeLive ? stripeLive.reduce((s, r) => s + r.amount, 0) : 0),
    by_source: bySource,
  });
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
