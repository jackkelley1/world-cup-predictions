"use client";

import { useEffect, useState } from "react";
import { flagEmojiForTeam } from "@/lib/flags";
import { pensSuffix } from "@/lib/format-picks";
import { scorePrediction } from "@/lib/scoring";
import type { PkSide } from "@/lib/knockout";

interface SCMatch {
  id: string;
  team1: string;
  team2: string;
  flag1: string | null;
  flag2: string | null;
  status: "upcoming" | "live" | "finished";
  score: [number, number] | null;
  pkWinner: PkSide | null;
  locked: boolean;
  kickoffLabel: string;
}

interface Pick {
  home: number;
  away: number;
  pkWinner: PkSide | null;
}

interface Card {
  userId: string;
  name: string;
  picks: Record<string, Pick>;
}

interface DayOption {
  key: string;
  label: string;
}

interface Data {
  days: DayOption[];
  dayKey: string;
  dayLabel: string | null;
  meId: string | null;
  matches: SCMatch[];
  cards: Card[];
}

function tierClass(tier: 0 | 1 | 2 | 3): string {
  switch (tier) {
    case 3:
      return "bg-accent text-[#04150d]";
    case 2:
      return "bg-accent/30 text-foreground";
    case 1:
      return "bg-surface-2 text-foreground";
    default:
      return "bg-red-500/15 text-red-300";
  }
}

function formatPickLabel(
  pick: Pick,
  m: SCMatch,
): string {
  const base = `${pick.home}-${pick.away}`;
  if (!pick.pkWinner) return base;
  return `${base}${pensSuffix(pick.pkWinner, m.team1, m.team2, m.flag1, m.flag2)}`;
}

export default function Scorecards() {
  const [data, setData] = useState<Data | null>(null);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const qs = day ? `?day=${encodeURIComponent(day)}` : "";
        const res = await fetch(`/wc/api/scorecards${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const d = (await res.json()) as Data;
        if (active) {
          setData(d);
          if (day === null) setDay(d.dayKey);
        }
      } catch {
        // ignore
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [day]);

  if (!data || data.matches.length === 0) return null;

  const idx = data.days.findIndex((d) => d.key === data.dayKey);
  const prevDay = idx > 0 ? data.days[idx - 1] : null;
  const nextDay =
    idx >= 0 && idx < data.days.length - 1 ? data.days[idx + 1] : null;
  const dayHasScores = data.matches.some((m) => m.score != null);

  const scored = data.cards.map((c) => {
    const total = data.matches.reduce((sum, m) => {
      const pick = c.picks[m.id];
      if (!pick || m.score == null) return sum;
      return (
        sum +
        scorePrediction(pick, {
          ftScore: m.score as [number, number],
          pkWinner: m.pkWinner,
        })
      );
    }, 0);
    return { card: c, total };
  });
  if (dayHasScores) {
    scored.sort(
      (a, b) => b.total - a.total || a.card.name.localeCompare(b.card.name),
    );
  }
  let prevTotal: number | null = null;
  let prevRank = 0;
  const rows = scored.map((s, i) => {
    let rank: number | null = null;
    if (dayHasScores) {
      rank = s.total === prevTotal ? prevRank : i + 1;
      prevTotal = s.total;
      prevRank = rank;
    }
    return { ...s, rank };
  });

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `${rank}`;
  };

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Scorecards</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => prevDay && setDay(prevDay.key)}
            disabled={!prevDay}
            aria-label="Previous day"
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <span className="min-w-[6.5rem] text-center text-xs font-medium text-muted">
            {data.dayLabel}
          </span>
          <button
            type="button"
            onClick={() => nextDay && setDay(nextDay.key)}
            disabled={!nextDay}
            aria-label="Next day"
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </div>

      {data.cards.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          No scorecards submitted yet for the day.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Player</span>
                    {dayHasScores && (
                      <span className="ml-auto text-xs font-medium text-muted">
                        Day pts
                      </span>
                    )}
                  </div>
                </th>
                {data.matches.map((m) => (
                  <th
                    key={m.id}
                    className="whitespace-nowrap px-3 py-2 text-center font-medium"
                  >
                    <div className="text-base leading-none">
                      {flagEmojiForTeam(m.team1, m.flag1)}
                      <span className="mx-0.5 text-muted">v</span>
                      {flagEmojiForTeam(m.team2, m.flag2)}
                    </div>
                    <div className="mt-1 text-[10px] font-normal text-muted">
                      {m.score
                        ? `${m.score[0]}-${m.score[1]}${m.pkWinner ? pensSuffix(m.pkWinner, m.team1, m.team2, m.flag1, m.flag2) : ""}${m.status === "live" ? " LIVE" : ""}`
                        : m.kickoffLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ card: c, total, rank }) => {
                const mine = c.userId === data.meId;
                return (
                  <tr
                    key={c.userId}
                    className={`border-b border-border/60 last:border-0 ${
                      mine ? "bg-accent/10" : ""
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-3 py-2 font-medium ${
                        mine ? "bg-[#172338]" : "bg-surface"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {rank != null && (
                          <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted">
                            {rankBadge(rank)}
                          </span>
                        )}
                        <span className="max-w-[8rem] truncate">{c.name}</span>
                        {mine && (
                          <span className="text-xs text-accent">you</span>
                        )}
                        {dayHasScores && (
                          <span className="ml-auto whitespace-nowrap rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-semibold text-foreground">
                            {total} pt{total === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </td>
                    {data.matches.map((m) => {
                      const pick = c.picks[m.id];
                      if (!pick) {
                        return (
                          <td
                            key={m.id}
                            className="px-3 py-2 text-center text-muted"
                          >
                            ·
                          </td>
                        );
                      }
                      const showTier = m.score != null;
                      const tier = showTier
                        ? scorePrediction(pick, {
                            ftScore: m.score as [number, number],
                            pkWinner: m.pkWinner,
                          })
                        : null;
                      const label = formatPickLabel(pick, m);
                      return (
                        <td key={m.id} className="px-2 py-2 text-center">
                          <span
                            className={`inline-block max-w-[7rem] rounded-md px-2 py-1 font-mono text-[10px] font-semibold leading-tight ${
                              tier != null
                                ? tierClass(tier)
                                : "bg-surface-2 text-foreground"
                            }`}
                            title={label}
                          >
                            {label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Finished matches color each pick by points: exact (3), winner + margin
        (2), right result (1), miss (0). Knockout ties that go to penalties use
        a separate shootout scoring scale (max 3).
      </p>
    </section>
  );
}
