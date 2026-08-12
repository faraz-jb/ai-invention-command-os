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

const DOT: Record<string, string> = {
  online: "bg-success",
  busy: "bg-warning",
  idle: "bg-text-dim",
  offline: "bg-text-dim/40",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents);
        setLoading(false);
      });
  }, []);

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
