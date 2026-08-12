"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import { formatMoney, relativeTime } from "@/lib/format";

interface DashboardData {
  stats: { active_projects: number; open_tasks: number; agents_online: number; sites_up: number };
  revenue_total: number;
  recent_projects: { id: string; name: string; type: string; status: string; priority: string; next_action: string }[];
  recent_tasks: { id: string; title: string; agent: string; status: string; priority: string }[];
  agent_statuses: { id: string; name: string; role: string; status: string; last_seen: string; current_task: string | null }[];
  cronsHealthy: number;
  cronsFailed: number;
  sessionsToday: number;
  tasksByStatus: { status: string; count: number }[];
  clientsTotal: number;
  clientsActive: number;
  deliverablesLive: number;
  clients: { id: string; name: string; status: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-text-dim">Loading dashboard...</p>;

  const cards = [
    { label: "Projects Active", value: data.stats.active_projects, href: "/projects" },
    { label: "Tasks Open", value: data.stats.open_tasks, href: "/tasks" },
    { label: "Agents Online", value: data.stats.agents_online, href: "/agents" },
    { label: "Sites Up", value: data.stats.sites_up, href: "/sites" },
    { label: "Clients Active", value: data.clientsActive, href: "/clients" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-text-dim text-sm">AI Invention — live operations overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
          >
            <p className="text-text-dim text-xs uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-semibold mt-1 text-accent">{c.value}</p>
          </Link>
        ))}
      </div>

      <Link
        href="/revenue"
        className="block bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
      >
        <p className="text-text-dim text-xs uppercase tracking-wide">Revenue this month</p>
        <p className="text-2xl font-semibold mt-1 text-success">{formatMoney(data.revenue_total)}</p>
      </Link>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wide">Crons Healthy</p>
          <p className="text-3xl font-semibold mt-1 text-success">{data.cronsHealthy}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wide">Crons Failed</p>
          <p className="text-3xl font-semibold mt-1 text-danger">{data.cronsFailed}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wide">Sessions Today</p>
          <p className="text-3xl font-semibold mt-1 text-accent">{data.sessionsToday}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-dim text-xs uppercase tracking-wide mb-2">Tasks by Status</p>
          <div className="space-y-1">
            {data.tasksByStatus.map((t) => (
              <div key={t.status} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-text-dim shrink-0">{STATUS_LABELS[t.status] ?? t.status}</span>
                <div className="flex-1 bg-surface-2 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (t.count / Math.max(1, Math.max(...data.tasksByStatus.map((x) => x.count)))) * 100
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-text-dim shrink-0">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-medium mb-3">Projects by status</h2>
          <ul className="space-y-2">
            {data.recent_projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={p.type}>{p.type}</Badge>
                  <Badge tone={p.status}>{p.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <h2 className="font-medium mb-3">Recent tasks</h2>
          <ul className="space-y-2">
            {data.recent_tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between text-sm gap-2">
                <span className="truncate">{t.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone={t.agent}>{t.agent}</Badge>
                  <Badge tone={t.status}>{t.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="font-medium mb-3">Clients</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {data.clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center gap-2 text-sm bg-surface-2 rounded-lg px-3 py-2 hover:bg-surface-2/70 transition-colors"
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  c.status === "active" ? "bg-success" : c.status === "onboarding" ? "bg-warning" : "bg-text-dim"
                }`}
              />
              <p className="truncate">{c.name}</p>
            </Link>
          ))}
          {data.clients.length === 0 && <p className="text-text-dim text-sm">No clients yet.</p>}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h2 className="font-medium mb-3">Agents</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {data.agent_statuses.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm bg-surface-2 rounded-lg px-3 py-2">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  a.status === "online"
                    ? "bg-success"
                    : a.status === "busy"
                    ? "bg-warning"
                    : a.status === "idle"
                    ? "bg-text-dim"
                    : "bg-text-dim/50"
                }`}
              />
              <div className="min-w-0">
                <p className="truncate">{a.name}</p>
                <p className="text-text-dim text-xs truncate">{relativeTime(a.last_seen)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
