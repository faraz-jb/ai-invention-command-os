import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { makeId } from "@/lib/id";
import type { CommandType } from "@/lib/types";

const TYPES: CommandType[] = ["restart", "redeploy", "fix", "healthcheck", "custom"];
const STATUSES = ["pending", "dispatched", "running", "success", "failed", "timeout"];

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("client_id");
  const status = req.nextUrl.searchParams.get("status");

  const db = getDb();
  let query = `
    SELECT cmd.*, c.name as client_name
    FROM commands cmd
    JOIN clients c ON c.id = cmd.client_id
    WHERE 1=1
  `;
  const params: string[] = [];
  if (clientId) {
    query += " AND cmd.client_id = ?";
    params.push(clientId);
  }
  if (status && STATUSES.includes(status)) {
    query += " AND cmd.status = ?";
    params.push(status);
  }
  query += " ORDER BY cmd.created_at DESC LIMIT 100";

  const commands = db.prepare(query).all(...params);
  return NextResponse.json({ commands });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.client_id !== "string" || !body.client_id.trim()) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  if (typeof body.type !== "string" || !TYPES.includes(body.type as CommandType)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const db = getDb();
  const client = db.prepare("SELECT id FROM clients WHERE id = ?").get(body.client_id);
  if (!client) return NextResponse.json({ error: "client not found" }, { status: 400 });

  const now = new Date().toISOString();
  const command = {
    id: makeId("cmd"),
    client_id: body.client_id,
    type: body.type as CommandType,
    target: body.target ? String(body.target) : "",
    payload: body.payload ? String(body.payload) : "",
    status: "pending",
    result: null,
    error: null,
    created_at: now,
    dispatched_at: null,
    completed_at: null,
  };

  db.prepare(
    `INSERT INTO commands (id, client_id, type, target, payload, status, result, error, created_at, dispatched_at, completed_at)
     VALUES (@id, @client_id, @type, @target, @payload, @status, @result, @error, @created_at, @dispatched_at, @completed_at)`
  ).run(command);

  return NextResponse.json({ command }, { status: 201 });
}
