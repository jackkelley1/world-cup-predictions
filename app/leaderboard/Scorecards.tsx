"use client";

import { useEffect, useState } from "react";
import { flagEmojiForTeam } from "@/lib/flags";
import { scoreMatch } from "@/lib/scoring";

interface SCMatch {
  id: string;
  team1: string;
  team2: string;
  flag1: string | null;
  flag2: string | null;
  status: "upcoming" | "live" | "finished";
  score: [number, number] | null;
  locked: boolean;
  kickoffLabel: string;
}

interface Card {
  userId: string;
  name: string;
  picks: Record<string, [number, number]>;
}

interface Data {
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

export default function Scorecards() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/wc/api/scorecards", { cache: "no-store" });
        if (!res.ok) return;
        const d = (await res.json()) as Data;
        if (active) setData(d);
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
  }, []);

  if (!data || data.matches.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Scorecards</h2>
        {data.dayLabel && (
          <span className="text-xs text-muted">{data.dayLabel}</span>
        )}
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
                  Player
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
                        ? `${m.score[0]}-${m.score[1]}${m.status === "live" ? " LIVE" : ""}`
                        : m.kickoffLabel}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cards.map((c) => {
                const mine = c.userId === data.meId;
                return (
                  <tr
                    key={c.userId}
                    className={`border-b border-border/60 last:border-0 ${
                      mine ? "bg-accent/10" : ""
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 max-w-[8rem] truncate px-3 py-2 font-medium ${
                        mine ? "bg-[#172338]" : "bg-surface"
                      }`}
                    >
                      {c.name}
                      {mine && (
                        <span className="ml-1.5 text-xs text-accent">you</span>
                      )}
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
                        ? scoreMatch(pick, m.score as [number, number])
                        : null;
                      return (
                        <td key={m.id} className="px-2 py-2 text-center">
                          <span
                            className={`inline-block min-w-[2.5rem] rounded-md px-2 py-1 font-mono text-xs font-semibold ${
                              tier != null
                                ? tierClass(tier)
                                : "bg-surface-2 text-foreground"
                            }`}
                          >
                            {pick[0]}-{pick[1]}
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
        (2), right result (1), miss (0).
      </p>
    </section>
  );
}
