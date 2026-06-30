"use client";

import { useEffect, useState } from "react";
import { APP_NAME, SHARE_URL } from "@/lib/config";
import { formatPickLine } from "@/lib/format-picks";
import { scorePrediction } from "@/lib/scoring";
import type { ClientMatch, PickEntry } from "./types";

type Picks = Record<string, PickEntry>;

function isFinished(
  m: ClientMatch,
): m is ClientMatch & { score: [number, number] } {
  return m.status === "finished" && m.score != null;
}

function ptsLabel(n: number): string {
  return `${n} ${n === 1 ? "pt" : "pts"}`;
}

export function buildResultsText(
  matches: ClientMatch[],
  picks: Picks,
  dayLabel: string,
  leader?: { name: string; points: number } | null,
): string {
  const lines: string[] = [`${APP_NAME} results — ${dayLabel}`];
  let total = 0;
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const [ah, aa] = m.score;
    const actualLine =
      formatPickLine(ah, aa, m.team1, m.team2, m.flag1, m.flag2, m.pkWinner);
    const p = picks[m.id];
    if (p && p.home !== "" && p.away !== "") {
      const tier = scorePrediction(
        {
          home: Number(p.home),
          away: Number(p.away),
          pkWinner: p.pkWinner,
        },
        { ftScore: [ah, aa], pkWinner: m.pkWinner },
      );
      total += tier;
      const yourLine = formatPickLine(
        p.home,
        p.away,
        m.team1,
        m.team2,
        m.flag1,
        m.flag2,
        p.pkWinner,
      );
      lines.push(`${actualLine} · you ${yourLine} (${ptsLabel(tier)})`);
    } else {
      lines.push(`${actualLine} · no pick`);
    }
  }
  if (leader) lines.push(`Leader: ${leader.name} (${ptsLabel(leader.points)})`);
  lines.push(`Your day: ${ptsLabel(total)} · see the board: ${SHARE_URL}`);
  return lines.join("\n");
}

export default function ShareResults({
  matches,
  picks,
  dayLabel,
}: {
  matches: ClientMatch[];
  picks: Picks;
  dayLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const [leader, setLeader] = useState<{ name: string; points: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/wc/api/leaderboard", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const top = data.scopes?.today?.entries?.[0];
        if (!cancelled && top && top.points > 0) {
          setLeader({ name: top.name, points: top.points });
        }
      } catch {
        // leaderboard is optional; ignore failures
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasFinished = matches.some(isFinished);
  if (!hasFinished) return null;

  const text = buildResultsText(matches, picks, dayLabel, leader);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Share today&apos;s results
        </h2>
        <button
          onClick={copy}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-[#04150d] transition-colors hover:bg-accent-strong"
        >
          {copied ? "Copied!" : "Copy results"}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm leading-6 text-foreground">
        {text}
      </pre>
    </section>
  );
}
