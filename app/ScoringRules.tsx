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
    blurb: "You nailed the final score (group stage and knockouts decided in 90/120 min).",
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

export const KNOCKOUT_PK_TIERS: ScoringTier[] = [
  {
    points: "2",
    title: "Exact tied score",
    blurb: "Knockout match went to penalties and you called the exact draw.",
    example: "You said 1–1 (pens), it ends 1–1 on pens",
  },
  {
    points: "1",
    title: "Any other tied score",
    blurb: "You predicted a draw but not the exact score before penalties.",
    example: "You said 2–2 (pens), it ends 1–1 on pens",
  },
  {
    points: "+1",
    title: "Correct PK winner",
    blurb: "Bonus on top of the tie score when you pick the shootout winner.",
    example: "Right pens pick adds 1 pt (max 3 total)",
  },
];

export default function ScoringRules({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-sm font-semibold text-foreground">Group stage & knockouts (no pens)</p>
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
      <p className="mt-2 text-sm font-semibold text-foreground">
        Knockout matches decided on penalties
      </p>
      <p className="text-xs text-muted">
        Tied knockout picks require a penalty-shootout winner. Scoring uses the
        pre-shootout score; the pens bonus stacks on top (max 3).
      </p>
      {KNOCKOUT_PK_TIERS.map((t) => (
        <div
          key={t.title}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/30 text-sm font-bold text-foreground">
            {t.points}
          </span>
          <div className="min-w-0">
            <span className="font-semibold">{t.title}</span>
            <p className="text-sm text-muted">{t.blurb}</p>
            {!compact && (
              <p className="mt-1 font-mono text-xs text-muted">{t.example}</p>
            )}
          </div>
        </div>
      ))}
      <p className="mt-1 text-xs text-muted">
        Only your highest tier counts for non-PK matches — PK scoring is additive
        up to 3.
      </p>
    </div>
  );
}
