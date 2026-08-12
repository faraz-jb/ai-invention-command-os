"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/Badge";
import { relativeTime } from "@/lib/format";

interface ClientDetail {
  id: string;
  name: string;
  box_host: string;
  plan: string;
  status: string;
  contact_email: string;
  notes: string;
  client_token: string;
}

interface DeliverableRow {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  deployed_at: string | null;
}

interface AgentRow {
  id: string;
  name: string;
  status: string;
  current_task: string | null;
  last_seen: string;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  phase_index: number;
}

interface SiteRow {
  id: string;
  name: string;
  url: string;
  status: string;
}

interface CommandRow {
  id: string;
  type: string;
  target: string;
  status: string;
  result: string | null;
  error: string | null;
  created_at: string;
}

const COMMAND_TYPES = [
  { type: "restart", label: "🔄 Restart" },
  { type: "redeploy", label: "🚀 Redeploy" },
  { type: "fix", label: "🔧 Fix" },
  { type: "healthcheck", label: "❤️ Health Check" },
];

function statusTone(status: string) {
  return status === "done" ? "client_done" : status;
}

const DELIVERABLE_TYPES = ["receptionist", "portal", "website", "dashboard", "automation", "agent", "other"];
const DELIVERABLE_STATUSES = ["live", "building", "planned"];
const CLIENT_STATUSES = ["active", "onboarding", "paused", "done"];

export default function ClientWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    box_host: "",
    plan: "",
    status: "active",
    contact_email: "",
    notes: "",
  });
  const [showDelivForm, setShowDelivForm] = useState(false);
  const [delivForm, setDelivForm] = useState({ name: "", type: "other", url: "", status: "live" });
  const [commands, setCommands] = useState<CommandRow[]>([]);
  const [dispatching, setDispatching] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ target: "", payload: "" });
  const [tokenCopied, setTokenCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/${id}`);
    const data = await res.json();
    setClient(data.client);
    setDeliverables(data.deliverables);
    setAgents(data.agents);
    setProjects(data.projects);
    setSites(data.sites);
    setEditForm({
      name: data.client.name,
      box_host: data.client.box_host,
      plan: data.client.plan,
      status: data.client.status,
      contact_email: data.client.contact_email,
      notes: data.client.notes,
    });
    setLoading(false);
  }

  async function loadCommands() {
    const res = await fetch(`/api/commands?client_id=${id}`);
    const data = await res.json();
    setCommands(data.commands ?? []);
  }

  useEffect(() => {
    if (id) {
      load();
      loadCommands();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function dispatchCommand(type: string, target?: string, payload?: string) {
    setDispatching(true);
    try {
      await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: id, type, target: target ?? "", payload: payload ?? "" }),
      });
      await loadCommands();
    } finally {
      setDispatching(false);
    }
  }

  async function submitCustomCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!customForm.payload.trim()) return;
    await dispatchCommand("custom", customForm.target, customForm.payload);
    setCustomForm({ target: "", payload: "" });
    setShowCustomForm(false);
  }

  function copyToken() {
    if (!client?.client_token) return;
    navigator.clipboard.writeText(client.client_token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 1500);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    load();
  }

  async function createDeliverable(e: React.FormEvent) {
    e.preventDefault();
    if (!delivForm.name.trim()) return;
    await fetch("/api/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...delivForm, client_id: id }),
    });
    setDelivForm({ name: "", type: "other", url: "", status: "live" });
    setShowDelivForm(false);
    load();
  }

  if (loading || !client) return <p className="text-text-dim">Loading client...</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/clients" className="text-text-dim text-sm hover:text-accent">
          ← Clients
        </Link>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
        {!editing ? (
          <>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-semibold">{client.name}</h1>
                <p className="text-text-dim text-sm">{client.box_host || "no box assigned"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={client.plan ? "internal" : "none"}>{client.plan || "no plan"}</Badge>
                <Badge tone={statusTone(client.status)}>{client.status}</Badge>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs bg-accent/15 text-accent px-3 py-1.5 rounded-md"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-text-dim uppercase tracking-wide">Contact</p>
                <p>{client.contact_email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-text-dim uppercase tracking-wide">Notes</p>
                <p className="text-text-dim">{client.notes || "—"}</p>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={saveEdit} className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Name</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Box host</label>
              <input
                value={editForm.box_host}
                onChange={(e) => setEditForm({ ...editForm, box_host: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Plan</label>
              <input
                value={editForm.plan}
                onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {CLIENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Contact email</label>
              <input
                value={editForm.contact_email}
                onChange={(e) => setEditForm({ ...editForm, contact_email: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-text-dim">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-sm text-text-dim px-4 py-2"
              >
                Cancel
              </button>
              <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Deliverables</h2>
          <button
            onClick={() => setShowDelivForm(!showDelivForm)}
            className="text-xs bg-accent/15 text-accent px-3 py-1.5 rounded-md"
          >
            + Add deliverable
          </button>
        </div>

        {showDelivForm && (
          <form
            onSubmit={createDeliverable}
            className="bg-surface border border-border rounded-xl p-4 grid sm:grid-cols-4 gap-3 items-end"
          >
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Name</label>
              <input
                value={delivForm.name}
                onChange={(e) => setDelivForm({ ...delivForm, name: e.target.value })}
                required
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Type</label>
              <select
                value={delivForm.type}
                onChange={(e) => setDelivForm({ ...delivForm, type: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {DELIVERABLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">URL</label>
              <input
                value={delivForm.url}
                onChange={(e) => setDelivForm({ ...delivForm, url: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-dim">Status</label>
              <select
                value={delivForm.status}
                onChange={(e) => setDelivForm({ ...delivForm, status: e.target.value })}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {DELIVERABLE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-4 flex justify-end">
              <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
                Create
              </button>
            </div>
          </form>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deliverables.map((d) => (
            <div key={d.id} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{d.name}</p>
                <Badge tone={d.type}>{d.type}</Badge>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noreferrer" className="text-accent text-xs hover:underline block truncate">
                  {d.url}
                </a>
              )}
              <div className="flex items-center justify-between text-xs">
                <Badge tone={d.status}>{d.status}</Badge>
                <span className="text-text-dim">{d.deployed_at ? relativeTime(d.deployed_at) : "not deployed"}</span>
              </div>
            </div>
          ))}
          {deliverables.length === 0 && <p className="text-text-dim text-sm">No deliverables yet.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Client Agents</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((a) => (
            <div key={a.id} className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    a.status === "online" ? "bg-success" : a.status === "busy" ? "bg-warning" : "bg-text-dim"
                  }`}
                />
                <p className="font-medium truncate">{a.name}</p>
              </div>
              <p className="text-xs text-text-dim">{a.current_task ?? "No active task"}</p>
              <p className="text-xs text-text-dim">Last seen {relativeTime(a.last_seen)}</p>
            </div>
          ))}
          {agents.length === 0 && <p className="text-text-dim text-sm">No agents assigned yet.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Projects</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border first:border-t-0">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">
                    <Badge tone={p.status}>{p.status}</Badge>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-text-dim text-sm">No projects yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Sites</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-border first:border-t-0">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={s.status}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-text-dim text-sm">No sites yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Remote Control</h2>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {COMMAND_TYPES.map((c) => (
              <button
                key={c.type}
                disabled={dispatching}
                onClick={() => dispatchCommand(c.type)}
                className="text-sm bg-accent/15 text-accent px-3 py-2 rounded-md disabled:opacity-50"
              >
                {c.label}
              </button>
            ))}
            <button
              disabled={dispatching}
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="text-sm bg-surface-2 border border-border px-3 py-2 rounded-md disabled:opacity-50"
            >
              ⚙️ Custom command
            </button>
          </div>

          {showCustomForm && (
            <form onSubmit={submitCustomCommand} className="grid sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-1">
                <label className="text-xs text-text-dim">Target / service</label>
                <input
                  value={customForm.target}
                  onChange={(e) => setCustomForm({ ...customForm, target: e.target.value })}
                  placeholder="e.g. receptionist"
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs text-text-dim">Command</label>
                <textarea
                  value={customForm.payload}
                  onChange={(e) => setCustomForm({ ...customForm, payload: e.target.value })}
                  rows={2}
                  required
                  placeholder="raw shell command to run on the client box"
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent font-mono"
                />
              </div>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={dispatching}
                  className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
                >
                  Queue command
                </button>
              </div>
            </form>
          )}

          {dispatching && <p className="text-xs text-accent">Command queued...</p>}

          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs text-text-dim uppercase tracking-wide">Agent Connect</p>
            <p className="text-xs text-text-dim">
              Run this on the client&apos;s box so it can poll for and execute commands:
            </p>
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-md px-3 py-2">
              <code className="text-xs text-text-dim flex-1 overflow-x-auto whitespace-nowrap">
                COMMAND_OS_URL=https://os.aiinvention.tech CLIENT_TOKEN={client.client_token} node
                scripts/command-os-client.cjs
              </code>
              <button
                onClick={copyToken}
                className="text-xs bg-accent/15 text-accent px-2 py-1 rounded-md shrink-0"
              >
                {tokenCopied ? "Copied" : "Copy token"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Command History</h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {commands.map((c) => (
                <tr key={c.id} className="border-t border-border first:border-t-0 align-top">
                  <td className="px-4 py-2">
                    <Badge tone={c.type}>{c.type}</Badge>
                  </td>
                  <td className="px-4 py-2 text-text-dim">{c.target || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={c.status}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-2 max-w-xs">
                    {c.result || c.error ? (
                      <details title={c.error ?? c.result ?? ""}>
                        <summary className="text-xs text-text-dim cursor-pointer truncate">
                          {(c.error ?? c.result ?? "").slice(0, 60)}
                          {(c.error ?? c.result ?? "").length > 60 ? "…" : ""}
                        </summary>
                        <pre className="text-xs text-text-dim whitespace-pre-wrap mt-1">
                          {c.error ?? c.result}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-xs text-text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-text-dim text-xs whitespace-nowrap">
                    {relativeTime(c.created_at)}
                  </td>
                </tr>
              ))}
              {commands.length === 0 && (
                <tr>
                  <td className="px-4 py-3 text-text-dim text-sm">No commands yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
