export interface ScoringTier {
  points: string;
  title: string;
  blurb: string;
  example: string;
}

export const SCORING_TIERS: ScoringTier[] = [
  {
    points: "3",
    title: "Exact score",
    blurb: "You nailed the final score.",
    example: "You said 2–1, it ends 2–1",
  },
  {
    points: "2",
    title: "Right winner + margin",
    blurb: "Correct winner and goal difference, but not the exact score.",
    example: "You said 2–1, it ends 3–2",
  },
  {
    points: "1",
    title: "Right result",
    blurb: "Correct winner, or you correctly called a draw.",
    example: "You said 2–1, it ends 1–0",
  },
  {
    points: "0",
    title: "Wrong result",
    blurb: "Wrong winner, or you called the wrong outcome.",
    example: "You said 2–1, it ends 0–2",
  },
];

export default function ScoringRules({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      {SCORING_TIERS.map((t) => (
        <div
          key={t.points}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              t.points === "0"
                ? "bg-surface text-muted"
                : "bg-accent text-[#04150d]"
            }`}
          >
            {t.points}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{t.title}</span>
              <span className="text-xs text-muted">
                {t.points === "1" ? "point" : "points"}
              </span>
            </div>
            <p className="text-sm text-muted">{t.blurb}</p>
            {!compact && (
              <p className="mt-1 font-mono text-xs text-muted">{t.example}</p>
            )}
          </div>
        </div>
      ))}
      <p className="mt-1 text-xs text-muted">
        Only your highest tier counts — scoring isn&apos;t cumulative.
      </p>
    </div>
  );
}
