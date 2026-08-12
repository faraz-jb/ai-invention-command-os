export const PHASE_LABELS = ["Idea", "Research", "Design", "Build", "Deploy", "SEO", "Launch", "Scale", "Done"];

export default function PhaseBar({ phaseIndex }: { phaseIndex: number }) {
  return (
    <div className="flex items-center gap-1 w-full max-w-xs">
      {PHASE_LABELS.map((label, idx) => (
        <div
          key={label}
          title={label}
          className={`h-1.5 flex-1 rounded-full ${idx <= phaseIndex ? "bg-accent" : "bg-border"}`}
        />
      ))}
    </div>
  );
}
