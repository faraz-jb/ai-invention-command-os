"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";
import type { SeoToolsData, PositionTrend, PositionQuery, PositionTrendQuery } from "@/lib/types";

const CHECKS: { key: keyof CheckableAudit; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "meta_description", label: "Meta" },
  { key: "canonical", label: "Canonical" },
  { key: "json_ld", label: "Schema" },
  { key: "viewport", label: "Viewport" },
  { key: "robots_txt", label: "Robots" },
  { key: "sitemap", label: "Sitemap" },
];

interface CheckableAudit {
  title: boolean;
  meta_description: boolean;
  canonical: boolean;
  json_ld: boolean;
  viewport: boolean;
  robots_txt: boolean;
  sitemap: boolean;
}

function PositionBadge({ position }: { position: number }) {
  if (position <= 10) return <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">Page 1</span>;
  if (position <= 20) return <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">Close</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-text-dim/15 text-text-dim">Page 2+</span>;
}

function TrendArrow({ trend }: { trend: PositionTrend }) {
  if (trend === "improving") return <span className="text-success">↑</span>;
  if (trend === "dropping") return <span className="text-danger">↓</span>;
  return <span className="text-text-dim">→</span>;
}

export default function SeoToolsPage() {
  const [data, setData] = useState<SeoToolsData | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/seo-tools")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-text-dim">Loading SEO tools...</p>;

  const { audit, positions, keywordGap } = data;

  const totalIssues = audit
    ? Object.values(audit.audits).reduce(
        (sum, a) => sum + CHECKS.filter((c) => !a[c.key]).length,
        0
      )
    : 0;

  async function copyText(text: string, i: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable, ignore
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">SEO Tools</h1>
        <p className="text-text-dim text-sm">Site audit, position tracking, and keyword gap — real GSC data</p>
      </div>

      {audit && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium border ${
            totalIssues > 0
              ? "bg-danger/10 border-danger/30 text-danger"
              : "bg-success/10 border-success/30 text-success"
          }`}
        >
          {totalIssues > 0 ? `${totalIssues} issues found` : "No issues found"}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Site Audit</h2>
          <p className="text-text-dim text-xs">
            {audit?.updated ? `Updated ${relativeTime(audit.updated)}` : "No data yet"}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {audit &&
            Object.entries(audit.audits).map(([name, a]) => (
              <div key={name} className="bg-surface border border-border rounded-xl p-4">
                <p className="text-text-dim text-xs uppercase tracking-wide truncate">{name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      a.http_status === 200 ? "bg-success" : "bg-danger"
                    }`}
                  />
                  <span className="text-sm">{a.http_status}</span>
                  <span className="text-text-dim text-xs">· {a.ttfb_ms}ms</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {CHECKS.map((c) => {
                    const ok = a[c.key];
                    return (
                      <span
                        key={c.key}
                        title={ok ? `${c.label}: OK` : `${c.label}: missing`}
                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                          ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-danger"}`} />
                        {c.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          {(!audit || Object.keys(audit.audits).length === 0) && (
            <p className="text-text-dim text-sm">No audit data yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Position Tracker</h2>
          <p className="text-text-dim text-xs">
            {positions?.updated ? `Updated ${relativeTime(positions.updated)}` : "No data yet"}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {positions &&
            Object.entries(positions.sites).map(([name, s]) => {
              const rows: (PositionTrendQuery | PositionQuery)[] =
                s.top_7d && s.top_7d.length > 0 ? s.top_7d.slice(0, 5) : s.top_queries.slice(0, 5);
              return (
                <div key={name} className="bg-surface border border-border rounded-xl p-4">
                  <h3 className="font-medium mb-3">{name}</h3>
                  <div className="space-y-2">
                    {rows.map((q, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{q.query}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-text-dim text-xs">{q.position.toFixed(1)}</span>
                          <PositionBadge position={q.position} />
                          <TrendArrow trend={"trend" in q ? q.trend : "stable"} />
                        </div>
                      </div>
                    ))}
                    {rows.length === 0 && <p className="text-text-dim text-sm">No queries yet.</p>}
                  </div>
                </div>
              );
            })}
          {(!positions || Object.keys(positions.sites).length === 0) && (
            <p className="text-text-dim text-sm">No position data yet.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Keyword Gap</h2>
          <p className="text-text-dim text-xs">
            {keywordGap?.updated ? `Updated ${relativeTime(keywordGap.updated)}` : "No data yet"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {keywordGap &&
            Object.entries(keywordGap.gsc_opportunities).map(([name, opps]) => {
              const quickWins = opps.filter((o) => o.position >= 5 && o.position <= 20);
              return (
                <div key={name} className="bg-surface border border-border rounded-xl p-4">
                  <h3 className="font-medium mb-3">{name} — quick wins</h3>
                  <div className="space-y-2">
                    {quickWins.map((o, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">{o.query}</span>
                        <div className="flex items-center gap-2 shrink-0 text-text-dim text-xs">
                          <span>pos {o.position.toFixed(1)}</span>
                          <span>· {o.impressions} impr</span>
                        </div>
                      </div>
                    ))}
                    {quickWins.length === 0 && <p className="text-text-dim text-sm">No quick wins yet.</p>}
                  </div>
                </div>
              );
            })}
          {(!keywordGap || Object.keys(keywordGap.gsc_opportunities).length === 0) && (
            <p className="text-text-dim text-sm">No keyword gap data yet.</p>
          )}
        </div>

        {keywordGap && keywordGap.autocomplete_ideas.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="font-medium mb-3">Fresh ideas</h3>
            <div className="flex flex-wrap gap-2">
              {keywordGap.autocomplete_ideas.map((idea, i) => (
                <button
                  key={i}
                  onClick={() => copyText(idea.suggestion, i)}
                  title={`seed: ${idea.seed}`}
                  className="text-xs bg-surface-2 hover:bg-accent/15 hover:text-accent rounded-full px-3 py-1.5 transition-colors"
                >
                  {copied === i ? "Copied!" : idea.suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
