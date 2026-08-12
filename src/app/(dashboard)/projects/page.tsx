"use client";

import { useEffect, useState } from "react";
import { useProjectsStore } from "@/store/useProjectsStore";
import Badge from "@/components/Badge";
import PhaseBar, { PHASE_LABELS } from "@/components/PhaseBar";
import { relativeTime } from "@/lib/format";

interface PhaseRow {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "done" | "blocked";
}

interface ProjectRow {
  id: string;
  name: string;
  type: "internal" | "client";
  client_name: string | null;
  domain: string | null;
  status: string;
  phase_index: number;
  priority: "low" | "medium" | "high";
  next_action: string;
  updated_at: string;
  phases: PhaseRow[];
}

const STATUSES = ["idea", "research", "design", "build", "deploy", "seo", "launch", "scale", "done"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { filter, setFilter, expandedId, toggleExpanded, showNewForm, setShowNewForm } = useProjectsStore();

  const [form, setForm] = useState({ name: "", type: "internal", client_name: "", domain: "", priority: "medium" });

  async function load() {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data.projects);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", type: "internal", client_name: "", domain: "", priority: "medium" });
    setShowNewForm(false);
    load();
  }

  async function updateProject(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  const filtered = projects.filter((p) => filter === "all" || p.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Pipeline Board</h1>
          <p className="text-text-dim text-sm">All AI Invention projects, tracked phase by phase</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md"
        >
          + New Project
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={createProject}
          className="bg-surface border border-border rounded-xl p-4 grid sm:grid-cols-2 md:grid-cols-5 gap-3 items-end"
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-text-dim">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="internal">internal</option>
              <option value="client">client</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Client name</label>
            <input
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Domain</label>
            <input
              value={form.domain}
              onChange={(e) => setForm({ ...form, domain: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
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
          <div className="md:col-span-5 flex justify-end">
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
              Create
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-1">
        {(["all", "internal", "client"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm capitalize ${
              filter === f ? "bg-accent/15 text-accent" : "text-text-dim hover:bg-surface-2"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-dim">Loading projects...</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="bg-surface border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => toggleExpanded(p.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-surface-2/50 transition-colors"
              >
                <div className="min-w-0 w-48 shrink-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {p.client_name && <p className="text-text-dim text-xs truncate">{p.client_name}</p>}
                </div>
                <Badge tone={p.type}>{p.type}</Badge>
                <PhaseBar phaseIndex={p.phase_index} />
                <Badge tone={p.status}>{p.status}</Badge>
                <Badge tone={p.priority}>{p.priority}</Badge>
                <span className="text-text-dim text-xs ml-auto">{relativeTime(p.updated_at)}</span>
              </button>
              <p className="px-4 pb-3 text-sm text-text-dim truncate">→ {p.next_action || "no next action set"}</p>

              {expandedId === p.id && (
                <div className="border-t border-border px-4 py-4 space-y-4 bg-surface-2/30">
                  <div>
                    <p className="text-xs text-text-dim uppercase tracking-wide mb-2">Phase checklist</p>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {PHASE_LABELS.map((label, idx) => (
                        <button
                          key={label}
                          onClick={() => updateProject(p.id, { phase_index: idx })}
                          className={`text-left text-sm px-3 py-2 rounded-md border ${
                            idx === p.phase_index
                              ? "border-accent text-accent bg-accent/10"
                              : idx < p.phase_index
                              ? "border-border text-success"
                              : "border-border text-text-dim"
                          }`}
                        >
                          {idx < p.phase_index ? "✅" : idx === p.phase_index ? "⏳" : "○"} {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-text-dim">Status</label>
                      <select
                        defaultValue={p.status}
                        onChange={(e) => updateProject(p.id, { status: e.target.value })}
                        className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <NextActionEditor projectId={p.id} value={p.next_action} onSave={updateProject} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NextActionEditor({
  projectId,
  value,
  onSave,
}: {
  projectId: string;
  value: string;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<void>;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="space-y-1">
      <label className="text-xs text-text-dim">Next action</label>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={() => onSave(projectId, { next_action: text })}
          className="shrink-0 bg-accent text-bg text-sm font-medium px-3 py-2 rounded-md"
        >
          Save
        </button>
      </div>
    </div>
  );
}
