import type { Match } from "./matches";
import type { PkSide } from "./knockout";

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

export interface MatchFinal {
  ftScore: [number, number];
  pkWinner: PkSide | null;
}

export interface PredictionRow {
  userId: string;
  matchId: string;
  home: number;
  away: number;
  pkWinner: PkSide | null;
}

export interface ScoreOverride {
  home: number;
  away: number;
  pkWinner: PkSide | null;
}

/**
 * Grade a prediction. When the actual match went to penalties, FT tie scoring
 * applies (exact tied score = 2, any other tied prediction = 1) plus +1 for the
 * correct shootout winner; max 3. Otherwise standard scoreMatch tiers apply.
 */
export function scorePrediction(
  pred: Pick<PredictionRow, "home" | "away" | "pkWinner">,
  actual: MatchFinal,
): Tier {
  const predScore: [number, number] = [pred.home, pred.away];
  const [ah, aa] = actual.ftScore;

  if (actual.pkWinner != null) {
    let points = 0;
    const predTied = pred.home === pred.away;
    const actualTied = ah === aa;

    if (predTied && actualTied) {
      points = pred.home === ah && pred.away === aa ? 2 : 1;
    }

    if (pred.pkWinner != null && pred.pkWinner === actual.pkWinner) {
      points += 1;
    }

    return Math.min(points, 3) as Tier;
  }

  return scoreMatch(predScore, actual.ftScore);
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  points: number;
  exact: number; // tier-3 count
  scored: number; // number of finished matches predicted
  rank: number;
}

/** Final result per match: admin override wins, else a finished feed score. */
export function buildMatchFinals(
  matches: Match[],
  overrides: Record<string, ScoreOverride>,
): Record<string, MatchFinal> {
  const finals: Record<string, MatchFinal> = {};
  for (const m of matches) {
    if (m.status === "finished" && m.score) {
      finals[m.id] = { ftScore: m.score, pkWinner: m.pkWinner };
    }
  }
  for (const [id, ov] of Object.entries(overrides)) {
    finals[id] = {
      ftScore: [ov.home, ov.away],
      pkWinner: ov.pkWinner,
    };
  }
  return finals;
}

/** @deprecated Use buildMatchFinals */
export function buildFinalScores(
  matches: Match[],
  overrides: Record<string, [number, number]>,
): Record<string, [number, number]> {
  const mapped: Record<string, ScoreOverride> = {};
  for (const [id, sc] of Object.entries(overrides)) {
    mapped[id] = { home: sc[0], away: sc[1], pkWinner: null };
  }
  const finals = buildMatchFinals(matches, mapped);
  const out: Record<string, [number, number]> = {};
  for (const [id, f] of Object.entries(finals)) out[id] = f.ftScore;
  return out;
}

export function buildLeaderboard(
  predictions: PredictionRow[],
  finals: Record<string, MatchFinal>,
  names: Record<string, string>,
): LeaderboardEntry[] {
  const agg = new Map<
    string,
    { points: number; exact: number; scored: number }
  >();

  for (const p of predictions) {
    const actual = finals[p.matchId];
    if (!actual) continue;
    const tier = scorePrediction(p, actual);
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
