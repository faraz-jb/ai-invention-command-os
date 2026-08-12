"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { relativeTime } from "@/lib/format";

interface SiteRow {
  id: string;
  name: string;
  url: string;
  status: string;
  last_check: string | null;
  http_code: number | null;
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  async function load() {
    const res = await fetch("/api/sites");
    const data = await res.json();
    setSites(data.sites);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function checkAll() {
    setChecking(true);
    const res = await fetch("/api/sites/check", { method: "POST" });
    const data = await res.json();
    setSites(data.sites);
    setChecking(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Sites</h1>
          <p className="text-text-dim text-sm">Uptime for all AI Invention properties</p>
        </div>
        <button
          onClick={checkAll}
          disabled={checking}
          className="bg-accent text-bg text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check All"}
        </button>
      </div>

      {loading ? (
        <p className="text-text-dim">Loading sites...</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-text-dim text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">URL</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">HTTP</th>
                <th className="text-left px-4 py-2 font-medium">Last check</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline"
                    >
                      {s.url}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={s.status}>{s.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-text-dim">{s.http_code ?? "—"}</td>
                  <td className="px-4 py-2 text-text-dim">{relativeTime(s.last_check)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
