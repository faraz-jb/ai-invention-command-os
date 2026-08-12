"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";

interface TaskRow {
  id: string;
  title: string;
  agent: string;
  status: string;
  priority: string;
  notes: string;
}

const AGENT_TABS = ["all", "vps", "laptop", "faraz"] as const;
const STATUSES = ["todo", "in_progress", "review", "done"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [agentFilter, setAgentFilter] = useState<(typeof AGENT_TABS)[number]>("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", agent: "none", priority: "medium" });

  async function load() {
    setLoading(true);
    const url = agentFilter === "all" ? "/api/tasks" : `/api/tasks?agent=${agentFilter}`;
    const res = await fetch(url);
    const data = await res.json();
    setTasks(data.tasks);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFilter]);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ title: "", agent: "none", priority: "medium" });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-text-dim text-sm">Work queued across agents</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md"
        >
          + New Task
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={createTask}
          className="bg-surface border border-border rounded-xl p-4 grid sm:grid-cols-4 gap-3 items-end"
        >
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-text-dim">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Agent</label>
            <select
              value={form.agent}
              onChange={(e) => setForm({ ...form, agent: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="none">none</option>
              <option value="vps">vps</option>
              <option value="laptop">laptop</option>
              <option value="faraz">faraz</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Priority</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
              Create
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1">
        {AGENT_TABS.map((f) => (
          <button
            key={f}
            onClick={() => setAgentFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize ${
              agentFilter === f ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-surface-2"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-dim">Loading tasks...</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
            >
              <span className="flex-1 min-w-[10rem] truncate">{t.title}</span>
              <Badge tone={t.agent}>{t.agent}</Badge>
              <Badge tone={t.priority}>{t.priority}</Badge>
              <select
                value={t.status}
                onChange={(e) => updateStatus(t.id, e.target.value)}
                className="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-accent"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-text-dim text-sm">No tasks here.</p>}
        </div>
      )}
    </div>
  );
}
