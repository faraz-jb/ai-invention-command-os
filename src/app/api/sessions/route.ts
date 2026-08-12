import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agent_id");

  const db = getDb();
  let query = `
    SELECT sessions.*, agents.name as agent_name
    FROM sessions
    JOIN agents ON agents.id = sessions.agent_id
    WHERE 1=1
  `;
  const args: string[] = [];
  if (agentId) {
    query += " AND sessions.agent_id = ?";
    args.push(agentId);
  }
  query += " ORDER BY sessions.started_at DESC";

  const sessions = db.prepare(query).all(...args);
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.agent_id !== "string" || !body.agent_id.trim()) {
    return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
  }

  const db = getDb();
  const agent = db.prepare("SELECT id FROM agents WHERE id = ?").get(body.agent_id);
  if (!agent) return NextResponse.json({ error: "agent not found" }, { status: 404 });

  const now = new Date().toISOString();
  const session = {
    id: makeId("sess"),
    agent_id: body.agent_id,
    task_id: body.task_id ? String(body.task_id) : null,
    started_at: now,
    ended_at: null,
    tokens_used: 0,
    summary: null,
    created_at: now,
  };

  db.prepare(`
    INSERT INTO sessions (id, agent_id, task_id, started_at, ended_at, tokens_used, summary, created_at)
    VALUES (@id, @agent_id, @task_id, @started_at, @ended_at, @tokens_used, @summary, @created_at)
  `).run(session);

  return NextResponse.json({ session }, { status: 201 });
}
