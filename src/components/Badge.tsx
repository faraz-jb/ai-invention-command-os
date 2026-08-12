const COLORS: Record<string, string> = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-text-dim/15 text-text-dim",
  internal: "bg-accent/15 text-accent",
  client: "bg-success/15 text-success",
  online: "bg-success/15 text-success",
  up: "bg-success/15 text-success",
  done: "bg-success/15 text-success",
  busy: "bg-warning/15 text-warning",
  degraded: "bg-warning/15 text-warning",
  in_progress: "bg-warning/15 text-warning",
  review: "bg-accent/15 text-accent",
  idle: "bg-text-dim/15 text-text-dim",
  todo: "bg-text-dim/15 text-text-dim",
  offline: "bg-text-dim/15 text-text-dim",
  down: "bg-danger/15 text-danger",
  blocked: "bg-danger/15 text-danger",
  pending: "bg-text-dim/15 text-text-dim",
};

export default function Badge({ children, tone }: { children: React.ReactNode; tone: string }) {
  const cls = COLORS[tone] ?? "bg-text-dim/15 text-text-dim";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}
