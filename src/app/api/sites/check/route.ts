import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { SiteStatus } from "@/lib/types";

async function checkUrl(url: string): Promise<{ status: SiteStatus; httpCode: number | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    clearTimeout(timeout);
    if (res.ok) return { status: "up", httpCode: res.status };
    if (res.status >= 500) return { status: "down", httpCode: res.status };
    return { status: "degraded", httpCode: res.status };
  } catch {
    clearTimeout(timeout);
    return { status: "down", httpCode: null };
  }
}

export async function POST() {
  const db = getDb();
  const sites = db.prepare("SELECT * FROM sites").all() as { id: string; url: string }[];

  const results = await Promise.all(
    sites.map(async (site) => {
      const { status, httpCode } = await checkUrl(site.url);
      return { id: site.id, status, httpCode };
    })
  );

  const now = new Date().toISOString();
  const update = db.prepare("UPDATE sites SET status=?, last_check=?, http_code=? WHERE id=?");
  const run = db.transaction(() => {
    for (const r of results) {
      update.run(r.status, now, r.httpCode, r.id);
    }
  });
  run();

  const updatedSites = db.prepare("SELECT * FROM sites ORDER BY name ASC").all();
  return NextResponse.json({ sites: updatedSites });
}
