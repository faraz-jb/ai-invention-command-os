import { NextResponse } from "next/server";

const REPOS = [
  "faraz-jb/ai-invention-command-os",
  "faraz-jb/ai-invention-blog",
  "faraz-jb/ai-invention-command-centre",
  "faraz-jb/ainowtools",
  "AI-Invention/ai-invention-company-os",
  "AI-Invention/lead-pipeline",
];

interface CiStatusRow {
  repo: string;
  workflow: string | null;
  status: "success" | "failure" | "pending" | "unavailable";
  timestamp: string | null;
}

interface GithubRun {
  name: string;
  status: string;
  conclusion: string | null;
  updated_at: string;
}

const CACHE_MS = 10 * 60 * 1000;
let cache: { rows: CiStatusRow[]; fetchedAt: number } | null = null;

async function fetchRepoStatus(repo: string): Promise<CiStatusRow> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return { repo, workflow: null, status: "unavailable", timestamp: null };

    const data = (await res.json()) as { workflow_runs: GithubRun[] };
    const run = data.workflow_runs?.[0];
    if (!run) return { repo, workflow: null, status: "unavailable", timestamp: null };

    const status: CiStatusRow["status"] =
      run.status !== "completed" ? "pending" : run.conclusion === "success" ? "success" : "failure";

    return { repo, workflow: run.name, status, timestamp: run.updated_at };
  } catch {
    return { repo, workflow: null, status: "unavailable", timestamp: null };
  }
}

export async function GET() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return NextResponse.json({ repos: cache.rows });
  }

  const rows = await Promise.all(REPOS.map(fetchRepoStatus));
  cache = { rows, fetchedAt: Date.now() };
  return NextResponse.json({ repos: rows });
}
