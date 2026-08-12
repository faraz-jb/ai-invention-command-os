import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import type { Priority, TaskAgent } from "@/lib/types";

const AGENTS = ["vps", "laptop", "faraz", "none"];
const STATUSES = ["todo", "in_progress", "review", "done"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agent = searchParams.get("agent");
  const status = searchParams.get("status");

  const db = getDb();
  let query = "SELECT * FROM tasks WHERE 1=1";
  const args: string[] = [];
  if (agent && AGENTS.includes(agent)) {
    query += " AND agent = ?";
    args.push(agent);
  }
  if (status && STATUSES.includes(status)) {
    query += " AND status = ?";
    args.push(status);
  }
  query += " ORDER BY updated_at DESC";

  const tasks = db.prepare(query).all(...args);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (body.agent !== undefined && !AGENTS.includes(body.agent)) {
    return NextResponse.json({ error: "invalid agent" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const task = {
    id: makeId("task"),
    title: body.title.trim(),
    project_id: body.project_id ? String(body.project_id) : null,
    agent: (body.agent as TaskAgent) ?? "none",
    status: "todo",
    priority: (["low", "medium", "high"].includes(body.priority) ? body.priority : "medium") as Priority,
    due_date: body.due_date ? String(body.due_date) : null,
    notes: body.notes ? String(body.notes) : "",
    created_at: now,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO tasks (id, title, project_id, agent, status, priority, due_date, notes, created_at, updated_at)
    VALUES (@id, @title, @project_id, @agent, @status, @priority, @due_date, @notes, @created_at, @updated_at)
  `).run(task);

  return NextResponse.json({ task }, { status: 201 });
}
