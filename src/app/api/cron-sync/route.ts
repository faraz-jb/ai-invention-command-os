import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

interface IncomingCron {
  id: string;
  name: string;
  schedule: string;
  status: string;
  agent: string;
  last_run: string | null;
  last_error?: string | null;
}

// VPS sends "error"/"never_run"; cron_jobs.status is constrained to ok|failed|never
// so the existing dashboard cronsHealthy/cronsFailed queries keep working unmodified.
function normalizeStatus(status: string): "ok" | "failed" | "never" {
  if (status === "ok") return "ok";
  if (status === "error" || status === "failed") return "failed";
  return "never";
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("X-Sync-Secret");
  if (!secret || secret !== process.env.CRON_SYNC_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "body must be an array of cron jobs" }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const upsert = db.prepare(`
    INSERT INTO cron_jobs (id, name, schedule, agent, status, last_run, last_message, next_run, created_at)
    VALUES (@id, @name, @schedule, @agent, @status, @last_run, @last_message, @next_run, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      schedule=excluded.schedule,
      agent=excluded.agent,
      status=excluded.status,
      last_run=excluded.last_run,
      last_message=excluded.last_message
  `);

  const jobs = body as IncomingCron[];
  const run = db.transaction(() => {
    for (const job of jobs) {
      if (!job.id || !job.name || !job.schedule) continue;
      upsert.run({
        id: job.id,
        name: job.name,
        schedule: job.schedule,
        agent: job.agent || "vps",
        status: normalizeStatus(job.status),
        last_run: job.last_run ?? null,
        last_message: job.last_error ?? null,
        next_run: null,
        created_at: now,
      });
    }
  });
  run();

  const { count } = db.prepare("SELECT COUNT(*) as count FROM cron_jobs").get() as { count: number };
  return NextResponse.json({ synced: body.length, total: count });
}
