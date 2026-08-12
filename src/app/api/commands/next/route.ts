import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const TIMEOUT_MS = 10 * 60 * 1000;

export async function GET(req: NextRequest) {
  const clientToken = req.nextUrl.searchParams.get("client_token");
  if (!clientToken) {
    return NextResponse.json({ error: "client_token is required" }, { status: 401 });
  }

  const db = getDb();
  const client = db.prepare("SELECT id FROM clients WHERE client_token = ?").get(clientToken) as
    | { id: string }
    | undefined;
  if (!client) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const pending = db
    .prepare(
      "SELECT * FROM commands WHERE client_id = ? AND status = 'pending' ORDER BY created_at ASC LIMIT 1"
    )
    .get(client.id) as Record<string, unknown> | undefined;

  if (pending) {
    const pendingId = pending.id as string;
    const now = new Date().toISOString();
    db.prepare("UPDATE commands SET status = 'dispatched', dispatched_at = ? WHERE id = ?").run(
      now,
      pendingId
    );
    const command = db.prepare("SELECT * FROM commands WHERE id = ?").get(pendingId);
    return NextResponse.json({ command });
  }

  const stale = db
    .prepare(
      "SELECT id, dispatched_at, created_at FROM commands WHERE client_id = ? AND status IN ('dispatched','running')"
    )
    .all(client.id) as { id: string; dispatched_at: string | null; created_at: string }[];

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const timeoutUpdate = db.prepare(
    "UPDATE commands SET status = 'timeout', completed_at = ?, error = ? WHERE id = ?"
  );
  for (const s of stale) {
    const referenceTime = new Date(s.dispatched_at ?? s.created_at).getTime();
    if (now - referenceTime > TIMEOUT_MS) {
      timeoutUpdate.run(nowIso, "timed out waiting for result", s.id);
    }
  }

  return NextResponse.json({ command: null });
}
