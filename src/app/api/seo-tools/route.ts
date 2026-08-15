import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { SeoAuditData, PositionTrackerData, KeywordGapData } from "@/lib/types";

export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const [audit, positions, keywordGap] = await Promise.all([
    readJson<SeoAuditData>("seo-audit.json"),
    readJson<PositionTrackerData>("position-tracker.json"),
    readJson<KeywordGapData>("keyword-gap.json"),
  ]);

  return NextResponse.json({ audit, positions, keywordGap });
}
