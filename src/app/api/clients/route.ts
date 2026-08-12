import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import type { ClientStatus } from "@/lib/types";

const STATUSES: ClientStatus[] = ["active", "onboarding", "paused", "done"];

export async function GET() {
  const db = getDb();
  const clients = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM deliverables d WHERE d.client_id = c.id) as deliverables_count,
        (SELECT COUNT(*) FROM agents a WHERE a.client_id = c.id) as agents_count,
        (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as projects_count
      FROM clients c
      ORDER BY c.name ASC`
    )
    .all();
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const client = {
    id: makeId("client"),
    name: body.name.trim(),
    box_host: body.box_host ? String(body.box_host) : "",
    plan: body.plan ? String(body.plan) : "",
    status: (body.status as ClientStatus) ?? "active",
    contact_email: body.contact_email ? String(body.contact_email) : "",
    notes: body.notes ? String(body.notes) : "",
    created_at: now,
    updated_at: now,
  };

  db.prepare(
    `INSERT INTO clients (id, name, box_host, plan, status, contact_email, notes, created_at, updated_at)
     VALUES (@id, @name, @box_host, @plan, @status, @contact_email, @notes, @created_at, @updated_at)`
  ).run(client);

  return NextResponse.json({ client }, { status: 201 });
}
