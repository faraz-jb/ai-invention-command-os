import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const ANALYTICS_PATH = path.join(DATA_DIR, "analytics.json");

const EMPTY_ANALYTICS = {
  updated: null,
  sites: {},
  adsense: { account: "unknown", sites: [] },
  containers: {},
  crons: { summary: { total: 0, ok: 0, error: 0, never_run: 0 }, errors: [] },
};

export async function GET() {
  try {
    const raw = await fs.readFile(ANALYTICS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(EMPTY_ANALYTICS);
  }
}
