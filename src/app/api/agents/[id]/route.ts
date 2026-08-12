import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const db = getDb();
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as
    | { role: string }
    | undefined;
  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const openTasks = db
    .prepare("SELECT * FROM tasks WHERE agent = ? AND status != 'done' ORDER BY updated_at DESC")
    .all(agent.role);

  const sessions = db
    .prepare("SELECT * FROM sessions WHERE agent_id = ? ORDER BY started_at DESC LIMIT 10")
    .all(id);

  return NextResponse.json({ agent, open_tasks: openTasks, sessions });
}
