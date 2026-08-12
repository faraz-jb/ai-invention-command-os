import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();

  const projectCounts = db
    .prepare("SELECT status, COUNT(*) as count FROM projects GROUP BY status")
    .all() as { status: string; count: number }[];

  const taskCounts = db
    .prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status")
    .all() as { status: string; count: number }[];

  const agentStatuses = db.prepare("SELECT id, name, role, status, last_seen, current_task FROM agents").all();

  const siteHealth = db
    .prepare("SELECT status, COUNT(*) as count FROM sites GROUP BY status")
    .all() as { status: string; count: number }[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const revenueTotal = db
    .prepare("SELECT COALESCE(SUM(amount), 0) as total FROM revenue WHERE date >= ?")
    .get(monthStart) as { total: number };

  const activeProjects = db
    .prepare("SELECT COUNT(*) as count FROM projects WHERE status != 'done'")
    .get() as { count: number };
  const openTasks = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'done'")
    .get() as { count: number };
  const agentsOnline = db
    .prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'online'")
    .get() as { count: number };
  const sitesUp = db.prepare("SELECT COUNT(*) as count FROM sites WHERE status = 'up'").get() as {
    count: number;
  };

  const recentProjects = db
    .prepare("SELECT id, name, type, status, priority, next_action FROM projects ORDER BY updated_at DESC LIMIT 8")
    .all();
  const recentTasks = db
    .prepare("SELECT id, title, agent, status, priority FROM tasks ORDER BY updated_at DESC LIMIT 8")
    .all();

  return NextResponse.json({
    project_counts: projectCounts,
    task_counts: taskCounts,
    agent_statuses: agentStatuses,
    site_health: siteHealth,
    revenue_total: revenueTotal.total,
    stats: {
      active_projects: activeProjects.count,
      open_tasks: openTasks.count,
      agents_online: agentsOnline.count,
      sites_up: sitesUp.count,
    },
    recent_projects: recentProjects,
    recent_tasks: recentTasks,
  });
}
