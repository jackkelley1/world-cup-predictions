import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getMatches } from "@/lib/matches";
import { buildLeaderboard, buildMatchFinals, type MatchFinal } from "@/lib/scoring";
import { tzDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  const [matches, predictions, names, overrides] = await Promise.all([
    getMatches(),
    store.getAllPredictions(),
    store.allUserNames(),
    store.getOverrides(),
  ]);

  const finals = buildMatchFinals(matches, overrides);
  const now = Date.now();
  const todayKey = tzDateKey(now);
  const kickoffById = new Map(matches.map((m) => [m.id, m.kickoff]));

  function filterFinals(
    keep: (kickoff: number | undefined) => boolean,
  ): Record<string, MatchFinal> {
    const out: Record<string, MatchFinal> = {};
    for (const [id, f] of Object.entries(finals)) {
      if (keep(kickoffById.get(id))) out[id] = f;
    }
    return out;
  }

  const todayFinals = filterFinals(
    (k) => k != null && tzDateKey(k) === todayKey,
  );

  function board(f: Record<string, MatchFinal>) {
    return {
      entries: buildLeaderboard(predictions, f, names),
      finishedCount: Object.keys(f).length,
    };
  }

  return NextResponse.json({
    scopes: {
      today: board(todayFinals),
      alltime: board(finals),
    },
    playerCount: Object.keys(names).length,
  });
}
