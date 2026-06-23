import ScoringRules from "../ScoringRules";

export const metadata = {
  title: "Scoring — WC Scoreline",
};

export default function ScoringPage() {
  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h1 className="mb-1 text-lg font-bold tracking-tight">
          How scoring works
        </h1>
        <p className="mb-4 text-sm text-muted">
          Reply with a final score for each match — home team first, e.g.{" "}
          <span className="font-mono">2–1</span>. Draws count too. Points are
          awarded per match:
        </p>
        <ScoringRules />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Example — match ends France 2–1 Iraq
        </h2>
        <ul className="flex flex-col gap-2 font-mono text-sm">
          <li className="flex items-center justify-between gap-3">
            <span>2–1</span>
            <span className="text-muted">3 pts — exact</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>3–2</span>
            <span className="text-muted">2 pts — right winner + margin</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>1–0</span>
            <span className="text-muted">1 pt — right winner</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>1–1</span>
            <span className="text-muted">0 pts — predicted a draw</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>0–2</span>
            <span className="text-muted">0 pts — wrong winner</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          The rules
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted">
          <li>One prediction per person per match.</li>
          <li>
            Predictions lock at kickoff — only your last pick before kickoff
            counts.
          </li>
          <li>Only your highest-scoring tier counts (it&apos;s not cumulative).</li>
          <li>The leaderboard updates live as matches finish.</li>
        </ul>
      </section>
    </div>
  );
}
