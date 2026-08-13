import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { ClientStatus } from "@/lib/types";

const STATUSES: ClientStatus[] = ["active", "onboarding", "paused", "done"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const deliverables = db
    .prepare("SELECT * FROM deliverables WHERE client_id = ? ORDER BY created_at DESC")
    .all(id);
  const agents = db.prepare("SELECT * FROM agents WHERE client_id = ? ORDER BY name ASC").all(id);
  const projects = db
    .prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY updated_at DESC")
    .all(id);
  const sites = db.prepare("SELECT * FROM sites WHERE client_id = ? ORDER BY name ASC").all(id);
  const services = db.prepare("SELECT * FROM services WHERE client_id = ? ORDER BY name ASC").all(id);

  return NextResponse.json({ client, deliverables, agents, projects, sites, services });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "client not found" }, { status: 404 });

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updated = {
    id,
    name: body.name !== undefined ? String(body.name).trim() : (existing.name as string),
    box_host: body.box_host !== undefined ? String(body.box_host) : (existing.box_host as string),
    plan: body.plan !== undefined ? String(body.plan) : (existing.plan as string),
    status: (body.status as ClientStatus) ?? (existing.status as ClientStatus),
    contact_email:
      body.contact_email !== undefined ? String(body.contact_email) : (existing.contact_email as string),
    notes: body.notes !== undefined ? String(body.notes) : (existing.notes as string),
    updated_at: now,
  };

  db.prepare(
    `UPDATE clients SET name=@name, box_host=@box_host, plan=@plan, status=@status,
      contact_email=@contact_email, notes=@notes, updated_at=@updated_at
     WHERE id=@id`
  ).run(updated);

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json({ client });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM clients WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "client not found" }, { status: 404 });

  const run = db.transaction(() => {
    db.prepare("DELETE FROM deliverables WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM services WHERE client_id = ?").run(id);
    db.prepare("UPDATE agents SET client_id = NULL WHERE client_id = ?").run(id);
    db.prepare("UPDATE projects SET client_id = NULL WHERE client_id = ?").run(id);
    db.prepare("UPDATE sites SET client_id = NULL WHERE client_id = ?").run(id);
    db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  });
  run();

  return NextResponse.json({ ok: true });
}
