import type { Match } from "./matches";

export type Tier = 0 | 1 | 2 | 3;

/**
 * Points for a single prediction vs the actual result (highest tier only):
 *   3 - exact score
 *   2 - right winner AND right goal difference (but not exact)
 *   1 - right result only (correct winner, or correctly called a draw)
 *   0 - wrong result
 */
export function scoreMatch(
  pred: [number, number],
  actual: [number, number],
): Tier {
  const [ph, pa] = pred;
  const [ah, aa] = actual;
  if (ph === ah && pa === aa) return 3;
  const sameWinner = Math.sign(ph - pa) === Math.sign(ah - aa);
  if (sameWinner && ph - pa === ah - aa) return 2;
  if (sameWinner) return 1;
  return 0;
}

export interface PredictionRow {
  userId: string;
  matchId: string;
  home: number;
  away: number;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  exact: number; // tier-3 count
  scored: number; // number of finished matches predicted
  rank: number;
}

/** Final result per match: an admin override wins, else a finished feed score. */
export function buildFinalScores(
  matches: Match[],
  overrides: Record<string, [number, number]>,
): Record<string, [number, number]> {
  const finals: Record<string, [number, number]> = {};
  for (const m of matches) {
    if (m.status === "finished" && m.score) finals[m.id] = m.score;
  }
  for (const [id, sc] of Object.entries(overrides)) finals[id] = sc;
  return finals;
}

export function buildLeaderboard(
  predictions: PredictionRow[],
  finals: Record<string, [number, number]>,
  names: Record<string, string>,
): LeaderboardEntry[] {
  const agg = new Map<
    string,
    { points: number; exact: number; scored: number }
  >();

  for (const p of predictions) {
    const actual = finals[p.matchId];
    if (!actual) continue;
    const tier = scoreMatch([p.home, p.away], actual);
    const cur = agg.get(p.userId) ?? { points: 0, exact: 0, scored: 0 };
    cur.points += tier;
    cur.scored += 1;
    if (tier === 3) cur.exact += 1;
    agg.set(p.userId, cur);
  }

  const entries: LeaderboardEntry[] = [...agg.entries()].map(
    ([userId, v]) => ({
      userId,
      name: names[userId] ?? "Anonymous",
      points: v.points,
      exact: v.exact,
      scored: v.scored,
      rank: 0,
    }),
  );

  entries.sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      a.name.localeCompare(b.name),
  );

  let rank = 0;
  let prevKey = "";
  entries.forEach((e, i) => {
    const key = `${e.points}|${e.exact}`;
    if (key !== prevKey) {
      rank = i + 1;
      prevKey = key;
    }
    e.rank = rank;
  });

  return entries;
}
