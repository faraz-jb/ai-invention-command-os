import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { DeliverableStatus, DeliverableType } from "@/lib/types";

const TYPES: DeliverableType[] = [
  "receptionist",
  "portal",
  "website",
  "dashboard",
  "automation",
  "agent",
  "other",
];
const STATUSES: DeliverableStatus[] = ["live", "building", "planned"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT * FROM deliverables WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return NextResponse.json({ error: "deliverable not found" }, { status: 404 });

  if (body.type !== undefined && !TYPES.includes(body.type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  if (body.name !== undefined && !String(body.name).trim()) {
    return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
  }

  const updated = {
    id,
    name: body.name !== undefined ? String(body.name).trim() : (existing.name as string),
    type: (body.type as DeliverableType) ?? (existing.type as DeliverableType),
    url: body.url !== undefined ? String(body.url) : (existing.url as string),
    status: (body.status as DeliverableStatus) ?? (existing.status as DeliverableStatus),
    deployed_at: existing.deployed_at as string | null,
    notes: body.notes !== undefined ? String(body.notes) : (existing.notes as string),
  };
  if (body.status === "live" && existing.status !== "live") {
    updated.deployed_at = new Date().toISOString();
  }

  db.prepare(
    `UPDATE deliverables SET name=@name, type=@type, url=@url, status=@status, deployed_at=@deployed_at, notes=@notes
     WHERE id=@id`
  ).run(updated);

  const deliverable = db.prepare("SELECT * FROM deliverables WHERE id = ?").get(id);
  return NextResponse.json({ deliverable });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM deliverables WHERE id = ?").get(id);
  if (!existing) return NextResponse.json({ error: "deliverable not found" }, { status: 404 });

  db.prepare("DELETE FROM deliverables WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
