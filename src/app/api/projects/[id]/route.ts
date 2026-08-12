import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { PHASES, PHASE_LABELS } from "@/lib/seed";
import type { Priority, ProjectStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "project not found" }, { status: 404 });

  let status = existing.status as ProjectStatus;
  let phaseIndex = existing.phase_index as number;

  if (typeof body.status === "string") {
    if (!PHASES.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    status = body.status as ProjectStatus;
    phaseIndex = PHASES.indexOf(status);
  } else if (typeof body.phase_index === "number") {
    if (body.phase_index < 0 || body.phase_index >= PHASES.length) {
      return NextResponse.json({ error: "invalid phase_index" }, { status: 400 });
    }
    phaseIndex = body.phase_index;
    status = PHASES[phaseIndex];
  }

  if (body.priority !== undefined && !["low", "medium", "high"].includes(body.priority)) {
    return NextResponse.json({ error: "invalid priority" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    name: body.name !== undefined ? String(body.name) : (existing.name as string),
    client_name: body.client_name !== undefined ? (body.client_name ? String(body.client_name) : null) : (existing.client_name as string | null),
    domain: body.domain !== undefined ? (body.domain ? String(body.domain) : null) : (existing.domain as string | null),
    status,
    phase_index: phaseIndex,
    priority: (body.priority as Priority) ?? (existing.priority as Priority),
    revenue_potential:
      body.revenue_potential !== undefined
        ? (body.revenue_potential ? String(body.revenue_potential) : null)
        : (existing.revenue_potential as string | null),
    next_action: body.next_action !== undefined ? String(body.next_action) : (existing.next_action as string),
    last_update: now,
    updated_at: now,
    id,
  };

  const run = db.transaction(() => {
    db.prepare(`
      UPDATE projects SET name=@name, client_name=@client_name, domain=@domain, status=@status,
        phase_index=@phase_index, priority=@priority, revenue_potential=@revenue_potential,
        next_action=@next_action, last_update=@last_update, updated_at=@updated_at
      WHERE id=@id
    `).run(updated);

    const updatePhase = db.prepare("UPDATE phases SET status=?, updated_at=? WHERE project_id=? AND name=?");
    PHASE_LABELS.forEach((label, idx) => {
      const phaseStatus = idx < phaseIndex ? "done" : idx === phaseIndex ? "in_progress" : "pending";
      updatePhase.run(phaseStatus, now, id, label);
    });
  });
  run();

  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  const phases = db.prepare("SELECT * FROM phases WHERE project_id = ? ORDER BY rowid ASC").all(id);

  return NextResponse.json({ project: { ...(project as object), phases } });
}
