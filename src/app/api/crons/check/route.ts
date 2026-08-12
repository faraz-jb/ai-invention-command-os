import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST() {
  const db = getDb();
  const crons = db.prepare("SELECT * FROM cron_jobs").all() as {
    id: string;
    status: string;
    last_run: string | null;
    next_run: string | null;
  }[];

  const now = new Date();
  const update = db.prepare("UPDATE cron_jobs SET next_run=? WHERE id=?");
  const run = db.transaction(() => {
    for (const c of crons) {
      const base = c.last_run ? new Date(c.last_run).getTime() : now.getTime();
      const nextRun = new Date(base + DAY_MS).toISOString();
      update.run(nextRun, c.id);
    }
  });
  run();

  const crons_updated = db.prepare("SELECT * FROM cron_jobs ORDER BY name ASC").all();
  return NextResponse.json({ crons: crons_updated });
}
