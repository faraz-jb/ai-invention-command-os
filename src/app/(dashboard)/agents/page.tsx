"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { relativeTime } from "@/lib/format";

interface AgentRow {
  id: string;
  name: string;
  role: string;
  status: string;
  last_seen: string;
  current_task: string | null;
  sessions_today: number;
  token_usage_month: number;
}

interface TaskRow {
  id: string;
  title: string;
  status: string;
  priority: string;
}

interface SessionRow {
  id: string;
  started_at: string;
  ended_at: string | null;
  tokens_used: number;
  summary: string | null;
}

interface AgentDetail {
  agent: AgentRow;
  open_tasks: TaskRow[];
  sessions: SessionRow[];
}

const DOT: Record<string, string> = {
  online: "bg-success",
  busy: "bg-warning",
  idle: "bg-text-dim",
  offline: "bg-text-dim/40",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pinging, setPinging] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/agents");
    const data = await res.json();
    setAgents(data.agents);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    const res = await fetch(`/api/agents/${id}`);
    const data = await res.json();
    setDetail(data);
    setDetailLoading(false);
  }

  async function ping(id: string) {
    setPinging(id);
    await fetch(`/api/agents/${id}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "online" }),
    });
    await load();
    setPinging(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-text-dim text-sm">VPS Hermes, Laptop Hermes, and client agents</p>
      </div>

      {loading ? (
        <p className="text-text-dim">Loading agents...</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <div key={a.id} className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <button className="w-full text-left space-y-3" onClick={() => toggleExpand(a.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${DOT[a.status] ?? "bg-text-dim"}`} />
                    <p className="font-medium truncate">{a.name}</p>
                  </div>
                  <Badge tone={a.role}>{a.role}</Badge>
                </div>
                <p className="text-sm text-text-dim">
                  {a.current_task ? `Working: ${a.current_task}` : "No active task"}
                </p>
                <div className="flex items-center justify-between text-xs text-text-dim">
                  <span>Last seen {relativeTime(a.last_seen)}</span>
                  <Badge tone={a.status}>{a.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-text-dim border-t border-border pt-2">
                  <span>{a.sessions_today} sessions today</span>
                  <span>{a.token_usage_month.toLocaleString()} tokens/mo</span>
                </div>
              </button>
              <button
                onClick={() => ping(a.id)}
                disabled={pinging === a.id}
                className="w-full text-xs bg-accent/15 text-accent px-3 py-1.5 rounded-md disabled:opacity-50"
              >
                {pinging === a.id ? "Pinging..." : "Ping"}
              </button>

              {expandedId === a.id && (
                <div className="border-t border-border pt-3 space-y-3">
                  {detailLoading ? (
                    <p className="text-xs text-text-dim">Loading detail...</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-text-dim mb-1">Open tasks</p>
                        <div className="space-y-1">
                          {detail?.open_tasks.map((t) => (
                            <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate">{t.title}</span>
                              <Badge tone={t.status}>{t.status}</Badge>
                            </div>
                          ))}
                          {detail?.open_tasks.length === 0 && (
                            <p className="text-xs text-text-dim">No open tasks.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-text-dim mb-1">Recent sessions</p>
                        <div className="space-y-1">
                          {detail?.sessions.map((s) => (
                            <div key={s.id} className="text-xs flex items-center justify-between gap-2">
                              <span className="truncate">{s.summary ?? "Session"}</span>
                              <span className="text-text-dim shrink-0">{relativeTime(s.started_at)}</span>
                            </div>
                          ))}
                          {detail?.sessions.length === 0 && (
                            <p className="text-xs text-text-dim">No sessions yet.</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
