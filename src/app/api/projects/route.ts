import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import { PHASE_LABELS } from "@/lib/seed";
import type { Priority, ProjectType } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all() as Record<string, unknown>[];

  const phaseStmt = db.prepare("SELECT * FROM phases WHERE project_id = ? ORDER BY rowid ASC");
  const withPhases = projects.map((p) => ({
    ...p,
    phases: phaseStmt.all(p.id as string),
  }));

  return NextResponse.json({ projects: withPhases });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim() || typeof body.type !== "string") {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }
  if (!["internal", "client"].includes(body.type)) {
    return NextResponse.json({ error: "type must be 'internal' or 'client'" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const id = makeId("proj");

  const project = {
    id,
    name: body.name.trim(),
    type: body.type as ProjectType,
    client_name: body.client_name ? String(body.client_name) : null,
    domain: body.domain ? String(body.domain) : null,
    status: "idea",
    phase_index: 0,
    priority: (["low", "medium", "high"].includes(body.priority) ? body.priority : "medium") as Priority,
    revenue_potential: body.revenue_potential ? String(body.revenue_potential) : null,
    last_update: now,
    next_action: body.next_action ? String(body.next_action) : "",
    created_at: now,
    updated_at: now,
  };

  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, type, client_name, domain, status, phase_index, priority, revenue_potential, last_update, next_action, created_at, updated_at)
    VALUES (@id, @name, @type, @client_name, @domain, @status, @phase_index, @priority, @revenue_potential, @last_update, @next_action, @created_at, @updated_at)
  `);
  const insertPhase = db.prepare(`
    INSERT INTO phases (id, project_id, name, status, notes, updated_at)
    VALUES (@id, @project_id, @name, @status, @notes, @updated_at)
  `);

  const run = db.transaction(() => {
    insertProject.run(project);
    PHASE_LABELS.forEach((label, idx) => {
      insertPhase.run({
        id: makeId("phase"),
        project_id: id,
        name: label,
        status: idx === 0 ? "in_progress" : "pending",
        notes: "",
        updated_at: now,
      });
    });
  });
  run();

  return NextResponse.json({ project }, { status: 201 });
}
