import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const db = getDb();
  const existing = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const now = new Date().toISOString();
  const tokensUsed = Number(body.tokens_used !== undefined ? body.tokens_used : existing.tokens_used);
  const summary = body.summary !== undefined ? String(body.summary) : (existing.summary as string | null);

  db.prepare(`
    UPDATE sessions SET ended_at=?, tokens_used=?, summary=?
    WHERE id=?
  `).run(now, tokensUsed, summary, id);

  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  return NextResponse.json({ session });
}
