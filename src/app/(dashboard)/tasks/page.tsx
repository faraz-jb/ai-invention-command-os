"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@/components/Badge";

interface TaskRow {
  id: string;
  title: string;
  project_id: string | null;
  agent: string;
  status: string;
  priority: string;
  notes: string;
}

interface ProjectRow {
  id: string;
  name: string;
}

const AGENT_TABS = ["all", "vps", "laptop", "faraz"] as const;
const COLUMNS: { status: string; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
];
const NEXT_STATUS: Record<string, string | null> = {
  todo: "in_progress",
  in_progress: "review",
  review: "done",
  done: null,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [agentFilter, setAgentFilter] = useState<(typeof AGENT_TABS)[number]>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", agent: "none", priority: "medium" });

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projects) map[p.id] = p.name;
    return map;
  }, [projects]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (agentFilter !== "all") params.set("agent", agentFilter);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/tasks?${params.toString()}`);
    const data = await res.json();
    setTasks(data.tasks);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(data.projects ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFilter, search]);

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

  async function updateTask(id: string, patch: Record<string, string>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
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

      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks..."
          className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-accent w-56"
        />
      </div>

      {loading ? (
        <p className="text-text-dim">Loading tasks...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="bg-surface border border-border rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium">{col.label}</h2>
                  <span className="text-xs text-text-dim">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => {
                    const next = NEXT_STATUS[t.status];
                    return (
                      <div key={t.id} className="bg-surface-2 border border-border rounded-lg p-3 space-y-2">
                        <p className="text-sm truncate" title={t.title}>
                          {t.title}
                        </p>
                        {t.project_id && projectMap[t.project_id] && (
                          <p className="text-xs text-text-dim truncate">{projectMap[t.project_id]}</p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge tone={t.priority}>{t.priority}</Badge>
                          <select
                            value={t.agent}
                            onChange={(e) => updateTask(t.id, { agent: e.target.value })}
                            className="bg-surface border border-border rounded-md px-2 py-1 text-xs outline-none focus:border-accent"
                          >
                            <option value="none">none</option>
                            <option value="vps">vps</option>
                            <option value="laptop">laptop</option>
                            <option value="faraz">faraz</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          {col.status !== "todo" ? (
                            <button
                              onClick={() =>
                                updateTask(t.id, {
                                  status: COLUMNS[COLUMNS.findIndex((c) => c.status === col.status) - 1].status,
                                })
                              }
                              className="text-xs text-text-dim hover:text-text"
                            >
                              ← Back
                            </button>
                          ) : (
                            <span />
                          )}
                          {next && (
                            <button
                              onClick={() => updateTask(t.id, { status: next })}
                              className="text-xs bg-accent/15 text-accent px-2 py-1 rounded-md"
                            >
                              Move →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && <p className="text-xs text-text-dim">No tasks.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
