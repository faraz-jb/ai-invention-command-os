import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
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

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  const db = getDb();
  const deliverables = clientId
    ? db
        .prepare("SELECT * FROM deliverables WHERE client_id = ? ORDER BY created_at DESC")
        .all(clientId)
    : db.prepare("SELECT * FROM deliverables ORDER BY created_at DESC").all();
  return NextResponse.json({ deliverables });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.client_id !== "string" || !body.client_id.trim()) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (body.type !== undefined && !TYPES.includes(body.type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const db = getDb();
  const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(body.client_id);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 400 });

  const now = new Date().toISOString();
  const deliverable = {
    id: makeId("deliv"),
    client_id: body.client_id,
    name: body.name.trim(),
    type: (body.type as DeliverableType) ?? "other",
    url: body.url ? String(body.url) : "",
    status: (body.status as DeliverableStatus) ?? "live",
    deployed_at: body.status === "planned" ? null : now,
    notes: body.notes ? String(body.notes) : "",
    created_at: now,
  };

  db.prepare(
    `INSERT INTO deliverables (id, client_id, name, type, url, status, deployed_at, notes, created_at)
     VALUES (@id, @client_id, @name, @type, @url, @status, @deployed_at, @notes, @created_at)`
  ).run(deliverable);

  return NextResponse.json({ deliverable }, { status: 201 });
}
