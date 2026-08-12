"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";

interface ClientRow {
  id: string;
  name: string;
  box_host: string;
  plan: string;
  status: string;
  deliverables_count: number;
  agents_count: number;
  projects_count: number;
}

function statusTone(status: string) {
  return status === "done" ? "client_done" : status;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({ name: "", plan: "", box_host: "" });

  async function load() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", plan: "", box_host: "" });
    setShowNewForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clients</h1>
          <p className="text-text-dim text-sm">Every client box, agent, and deliverable — separate from our internal ops</p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md"
        >
          + New Client
        </button>
      </div>

      {showNewForm && (
        <form
          onSubmit={createClient}
          className="bg-surface border border-border rounded-xl p-4 grid sm:grid-cols-3 gap-3 items-end"
        >
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Plan</label>
            <input
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Box host</label>
            <input
              value={form.box_host}
              onChange={(e) => setForm({ ...form, box_host: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
              Create
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-text-dim">Loading clients...</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-dim text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Plan</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Box</th>
                <th className="text-left px-4 py-2 font-medium">Deliverables</th>
                <th className="text-left px-4 py-2 font-medium">Agents</th>
                <th className="text-left px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-text-dim">{c.plan || "—"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-text-dim">{c.box_host || "—"}</td>
                  <td className="px-4 py-2 text-text-dim">{c.deliverables_count}</td>
                  <td className="px-4 py-2 text-text-dim">{c.agents_count}</td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/clients/${c.id}`} className="text-accent hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-3 text-text-dim text-sm">
                    No clients yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
