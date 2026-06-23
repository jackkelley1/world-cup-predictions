import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getMatches } from "@/lib/matches";
import { buildFinalScores, buildLeaderboard } from "@/lib/scoring";
import { tzDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const store = getStore();
  const [matches, predictions, names, overrides] = await Promise.all([
    getMatches(),
    store.getAllPredictions(),
    store.allUserNames(),
    store.getOverrides(),
  ]);

  const finals = buildFinalScores(matches, overrides);
  const now = Date.now();
  const todayKey = tzDateKey(now);
  const kickoffById = new Map(matches.map((m) => [m.id, m.kickoff]));

  function filterFinals(
    keep: (kickoff: number | undefined) => boolean,
  ): Record<string, [number, number]> {
    const out: Record<string, [number, number]> = {};
    for (const [id, sc] of Object.entries(finals)) {
      if (keep(kickoffById.get(id))) out[id] = sc;
    }
    return out;
  }

  const todayFinals = filterFinals(
    (k) => k != null && tzDateKey(k) === todayKey,
  );
  const weekFinals = filterFinals((k) => k != null && k >= now - WEEK_MS);

  function board(f: Record<string, [number, number]>) {
    return {
      entries: buildLeaderboard(predictions, f, names),
      finishedCount: Object.keys(f).length,
    };
  }

  return NextResponse.json({
    scopes: {
      today: board(todayFinals),
      week: board(weekFinals),
      alltime: board(finals),
    },
    playerCount: Object.keys(names).length,
  });
}
