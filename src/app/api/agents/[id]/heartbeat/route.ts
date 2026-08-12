import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const STATUSES = ["online", "offline", "busy", "idle"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const db = getDb();
  const existing = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const status = String(body.status ?? existing.status);
  const currentTask =
    body.current_task !== undefined ? (body.current_task ? String(body.current_task) : null) : (existing.current_task as string | null);
  const sessionsToday = Number(body.sessions_today !== undefined ? body.sessions_today : existing.sessions_today);
  const tokenUsage = Number(
    body.token_usage_month !== undefined ? body.token_usage_month : existing.token_usage_month
  );

  db.prepare(`
    UPDATE agents SET status=?, last_seen=?, current_task=?, sessions_today=?, token_usage_month=?
    WHERE id=?
  `).run(status, now, currentTask, sessionsToday, tokenUsage, id);

  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  return NextResponse.json({ agent });
}
