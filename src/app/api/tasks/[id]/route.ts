import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const AGENTS = ["vps", "laptop", "faraz", "none"];
const STATUSES = ["todo", "in_progress", "review", "done"];
const PRIORITIES = ["low", "medium", "high"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "task not found" }, { status: 404 });

  const agentValue = body.agent !== undefined ? body.agent : body.assignee;

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (agentValue !== undefined && !AGENTS.includes(agentValue)) {
    return NextResponse.json({ error: "invalid agent" }, { status: 400 });
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    id,
    title: body.title !== undefined ? String(body.title) : (existing.title as string),
    agent: agentValue ?? (existing.agent as string),
    status: body.status ?? (existing.status as string),
    priority: body.priority ?? (existing.priority as string),
    due_date: body.due_date !== undefined ? (body.due_date ? String(body.due_date) : null) : (existing.due_date as string | null),
    notes: body.notes !== undefined ? String(body.notes) : (existing.notes as string),
    updated_at: now,
  };

  db.prepare(`
    UPDATE tasks SET title=@title, agent=@agent, status=@status, priority=@priority,
      due_date=@due_date, notes=@notes, updated_at=@updated_at
    WHERE id=@id
  `).run(updated);

  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  return NextResponse.json({ task });
}
