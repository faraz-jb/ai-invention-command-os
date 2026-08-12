"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { formatMoney } from "@/lib/format";

interface RevenueRow {
  id: string;
  source: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
}

interface RevenueData {
  revenue: RevenueRow[];
  month: string;
  month_total: number;
  total_revenue: number;
  by_source: Record<string, number>;
}

const SOURCES = ["manual", "stripe", "gumroad", "adsense"];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source: "manual", amount: "", description: "" });

  async function load(m: string) {
    setLoading(true);
    const res = await fetch(`/api/revenue?month=${m}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    load(month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount)) return;
    await fetch("/api/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: form.source, amount, description: form.description }),
    });
    setForm({ source: "manual", amount: "", description: "" });
    setShowForm(false);
    load(month);
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/revenue/${id}`, { method: "DELETE" });
    load(month);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Revenue</h1>
          <p className="text-text-dim text-sm">Real income across all sources — no mock data</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md"
          >
            + Add Entry
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={addEntry}
          className="bg-surface border border-border rounded-xl p-4 grid sm:grid-cols-4 gap-3 items-end"
        >
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Source</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-dim">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-text-dim">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="sm:col-span-4 flex justify-end">
            <button type="submit" className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md">
              Save
            </button>
          </div>
        </form>
      )}

      {loading || !data ? (
        <p className="text-text-dim">Loading revenue...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-text-dim text-xs uppercase tracking-wide">Revenue This Month</p>
              <p className="text-2xl font-semibold mt-1 text-success">{formatMoney(data.month_total)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-text-dim text-xs uppercase tracking-wide">Total Revenue</p>
              <p className="text-2xl font-semibold mt-1 text-accent">{formatMoney(data.total_revenue)}</p>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 col-span-2">
              <p className="text-text-dim text-xs uppercase tracking-wide mb-2">This Month by Source</p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map((s) => (
                  <div key={s} className="flex items-center gap-1.5 bg-surface-2 rounded-full px-3 py-1">
                    <Badge tone={s}>{s}</Badge>
                    <span className="text-xs text-text-dim">{formatMoney(data.by_source[s] ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-text-dim text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Source</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-left px-4 py-2 font-medium">Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-text-dim">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <Badge tone={r.source}>{r.source}</Badge>
                    </td>
                    <td className="px-4 py-2 text-text-dim truncate max-w-[16rem]">{r.description || "—"}</td>
                    <td className="px-4 py-2 font-medium">{formatMoney(r.amount, r.currency)}</td>
                    <td className="px-4 py-2">
                      {!r.id.startsWith("stripe_") && (
                        <button
                          onClick={() => deleteEntry(r.id)}
                          className="text-xs text-text-dim hover:text-danger"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {data.revenue.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-text-dim text-sm text-center">
                      No revenue entries for {month} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
