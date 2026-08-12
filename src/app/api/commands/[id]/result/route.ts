import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const STATUSES = ["running", "success", "failed", "timeout"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.client_token !== "string" || !body.client_token) {
    return NextResponse.json({ error: "client_token is required" }, { status: 401 });
  }
  if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const db = getDb();
  const command = db.prepare("SELECT * FROM commands WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!command) return NextResponse.json({ error: "command not found" }, { status: 404 });

  const client = db
    .prepare("SELECT client_token FROM clients WHERE id = ?")
    .get(command.client_id as string) as { client_token: string } | undefined;
  if (!client || client.client_token !== body.client_token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const status = body.status as string;
  const isTerminal = status === "success" || status === "failed" || status === "timeout";
  const updated = {
    id,
    status,
    result: body.result !== undefined ? String(body.result) : (command.result as string | null),
    error: status === "failed" && body.error !== undefined ? String(body.error) : (command.error as string | null),
    completed_at: isTerminal ? now : (command.completed_at as string | null),
  };

  db.prepare(
    `UPDATE commands SET status=@status, result=@result, error=@error, completed_at=@completed_at WHERE id=@id`
  ).run(updated);

  const updatedCommand = db.prepare("SELECT * FROM commands WHERE id = ?").get(id);
  return NextResponse.json({ command: updatedCommand });
}
