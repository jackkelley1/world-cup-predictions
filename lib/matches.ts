import { COUNTDOWN_OVERRIDE } from "./config";
import { getStore } from "./db";
import { flagUrlForTeam } from "./flags";
import {
  isKnockoutMatch,
  pkWinnerFromPenalties,
  pkWinnerFromTeamName,
  type PkSide,
} from "./knockout";
import { tzDateKey } from "./time";

const FEED_URL = "https://wcup2026.org/api/data.php?action=all";
const FALLBACK_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

export type MatchStatus = "upcoming" | "live" | "finished";

export interface Match {
  id: string;
  round: string;
  group: string;
  team1: string;
  team2: string;
  flag1: string | null;
  flag2: string | null;
  status: MatchStatus;
  /** Knockout round (not a group-stage matchday). */
  isKnockout: boolean;
  /** Score before a shootout (after ET when played), or null if not started. */
  score: [number, number] | null;
  /** Shootout winner when the match was decided on penalties. */
  pkWinner: PkSide | null;
  liveMinute: number | null;
  /** Kickoff as epoch milliseconds. */
  kickoff: number;
  ground: string;
}

export type { PkSide };
export { isKnockoutMatch };

const TTL_MS = 30_000;
let cache: { at: number; data: Match[] } | null = null;
let lastGood: Match[] | null = null;

function normalizeStatus(s: unknown): MatchStatus {
  if (s === "live") return "live";
  if (s === "finished" || s === "completed" || s === "ended") return "finished";
  return "upcoming";
}

function normalizeScore(raw: unknown): [number, number] | null {
  if (Array.isArray(raw) && raw.length === 2) {
    const h = Number(raw[0]);
    const a = Number(raw[1]);
    if (Number.isFinite(h) && Number.isFinite(a)) return [h, a];
  }
  return null;
}

interface ParsedScores {
  ftScore: [number, number] | null;
  pkWinner: PkSide | null;
}

/** Parse regulation/ET score and optional shootout winner from feed fields. */
function parseMatchScores(
  o: Record<string, unknown>,
  team1: string,
  team2: string,
): ParsedScores {
  const raw = o.score;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const scoreObj = raw as Record<string, unknown>;
    const ft = normalizeScore(scoreObj.ft);
    const et = normalizeScore(scoreObj.et);
    const pens = normalizeScore(scoreObj.p);
    const ftScore = et ?? ft;
    const pkWinner = pens ? pkWinnerFromPenalties(pens) : null;
    return { ftScore, pkWinner };
  }

  const ftScore = normalizeScore(raw);
  const pens =
    normalizeScore(o.penalty_score) ??
    normalizeScore(o.pens) ??
    normalizeScore(o.penalties) ??
    normalizeScore(o.pk_score);
  let pkWinner = pens ? pkWinnerFromPenalties(pens) : null;

  const winnerRaw = o.penalty_winner ?? o.pk_winner ?? o.shootout_winner;
  if (!pkWinner && typeof winnerRaw === "string") {
    pkWinner = pkWinnerFromTeamName(winnerRaw, team1, team2);
  }
  if (!pkWinner && (winnerRaw === 1 || winnerRaw === "1" || winnerRaw === "home")) {
    pkWinner = "home";
  }
  if (!pkWinner && (winnerRaw === 2 || winnerRaw === "2" || winnerRaw === "away")) {
    pkWinner = "away";
  }

  return { ftScore, pkWinner };
}

/** Parse the live wcup2026.org `action=all` response. */
function normalizeFeed(json: unknown): Match[] {
  const matches = (json as { matches?: unknown[] })?.matches;
  if (!Array.isArray(matches)) throw new Error("unexpected feed shape");
  return matches
    .map((m): Match | null => {
      const o = m as Record<string, unknown>;
      const kickoffSec = Number(o.datetime);
      if (!Number.isFinite(kickoffSec)) return null;
      const status = normalizeStatus(o.status);
      const team1 = String(o.team1 ?? "TBD");
      const team2 = String(o.team2 ?? "TBD");
      const round = String(o.round ?? "");
      const group = String(o.group ?? "");
      const { ftScore, pkWinner } = parseMatchScores(o, team1, team2);
      return {
        id: String(o.id),
        round,
        group,
        team1,
        team2,
        flag1: (o.flag1 as string) ?? null,
        flag2: (o.flag2 as string) ?? null,
        status,
        isKnockout: isKnockoutMatch(round, group),
        score: status === "upcoming" ? null : ftScore,
        pkWinner: status === "upcoming" ? null : pkWinner,
        liveMinute:
          o.live_minute != null && Number.isFinite(Number(o.live_minute))
            ? Number(o.live_minute)
            : null,
        kickoff: kickoffSec * 1000,
        ground: String(o.ground ?? ""),
      };
    })
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.kickoff - b.kickoff);
}

/** Parse "13:00 UTC-6" + "2026-06-22" into epoch ms. */
function parseOpenFootballKickoff(date: string, time: string): number | null {
  const m = time.match(/^(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (!m) return null;
  const [, hh, mm, off] = m;
  const offset = Number(off);
  const sign = offset >= 0 ? "+" : "-";
  const pad = String(Math.abs(offset)).padStart(2, "0");
  const iso = `${date}T${hh.padStart(2, "0")}:${mm}:00${sign}${pad}:00`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Fallback: public-domain openfootball schedule (no live layer, lags on scores). */
function normalizeOpenFootball(json: unknown): Match[] {
  const matches = (json as { matches?: unknown[] })?.matches;
  if (!Array.isArray(matches)) throw new Error("unexpected fallback shape");
  const now = Date.now();
  return matches
    .map((m): Match | null => {
      const o = m as Record<string, unknown>;
      const date = String(o.date ?? "");
      const time = String(o.time ?? "12:00 UTC+0");
      const kickoff = parseOpenFootballKickoff(date, time);
      if (kickoff == null) return null;
      const team1 = String(o.team1 ?? "TBD");
      const team2 = String(o.team2 ?? "TBD");
      const round = String(o.round ?? "");
      const group = String(o.group ?? "");
      const { ftScore, pkWinner } = parseMatchScores(o, team1, team2);
      const status: MatchStatus = ftScore
        ? "finished"
        : now >= kickoff
          ? "live"
          : "upcoming";
      return {
        id: `${date}-${team1}-${team2}`.replace(/\s+/g, "_"),
        round,
        group,
        team1,
        team2,
        flag1: flagUrlForTeam(team1),
        flag2: flagUrlForTeam(team2),
        status,
        isKnockout: isKnockoutMatch(round, group),
        score: ftScore,
        pkWinner: ftScore ? pkWinner : null,
        liveMinute: null,
        kickoff,
        ground: String(o.ground ?? ""),
      };
    })
    .filter((m): m is Match => m !== null)
    .sort((a, b) => a.kickoff - b.kickoff);
}

async function fetchFallback(): Promise<Match[]> {
  const res = await fetch(FALLBACK_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`fallback ${res.status}`);
  return normalizeOpenFootball(await res.json());
}

/** Persist the last-good primary feed so outages never change match IDs. */
async function persistMatchCache(data: Match[]): Promise<void> {
  try {
    await getStore().setMatchCache(data);
  } catch {
    // best-effort; never let cache writes break the request
  }
}

/** Read the DB-persisted last-good primary feed (survives redeploys). */
async function readMatchCache(): Promise<Match[] | null> {
  try {
    const cached = await getStore().getMatchCache();
    if (cached && Array.isArray(cached.json) && cached.json.length > 0) {
      return cached.json as Match[];
    }
  } catch {
    // ignore; fall through
  }
  return null;
}

/**
 * All tournament matches, cached ~30s in memory.
 *
 * On a feed failure we serve the last-good primary data — first from memory,
 * then from the DB (which survives redeploys). The openfootball fallback uses
 * different match IDs, so it is only a true cold-start last resort: switching to
 * it would orphan every saved prediction.
 */
export async function getMatches(): Promise<Match[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  try {
    const res = await fetch(FEED_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const data = normalizeFeed(await res.json());
    if (data.length === 0) throw new Error("empty feed");
    cache = { at: Date.now(), data };
    lastGood = data;
    void persistMatchCache(data);
    return data;
  } catch {
    if (lastGood) return lastGood;
    // Prefer the persisted primary feed so IDs stay stable across deploys.
    const dbCached = await readMatchCache();
    if (dbCached) {
      cache = { at: Date.now(), data: dbCached };
      lastGood = dbCached;
      return dbCached;
    }
    // Cold start only, with no cached primary data anywhere.
    try {
      const data = await fetchFallback();
      cache = { at: Date.now(), data };
      lastGood = data;
      return data;
    } catch {
      return [];
    }
  }
}

export async function getMatchById(id: string): Promise<Match | undefined> {
  const all = await getMatches();
  return all.find((m) => m.id === id);
}

/** A match is locked for predictions once its kickoff has passed. */
export function isLocked(match: Match, now: number = Date.now()): boolean {
  return now >= match.kickoff || match.status !== "upcoming";
}

export interface Matchday {
  /** "YYYY-MM-DD" day shown to the user. */
  dayKey: string;
  matches: Match[];
  /** Next kickoff (epoch ms) that hasn't started yet, anywhere; null if none left. */
  nextKickoff: number | null;
  /** The next match to lock (drives the countdown label), or null. */
  nextMatch: Match | null;
  /** All of the displayed day's matches have kicked off. */
  allLocked: boolean;
}

/**
 * Pick the day to display and the next lock target.
 * - Shows today's matches (in app tz) if today has games.
 * - Otherwise shows the next upcoming match day.
 * - The countdown targets the next not-yet-started kickoff anywhere, so today it
 *   naturally lands on the next game (e.g. the 2pm France match).
 */
export function getMatchday(all: Match[], now: number = Date.now()): Matchday {
  const todayKey = tzDateKey(now);
  const byDay = new Map<string, Match[]>();
  for (const m of all) {
    const key = tzDateKey(m.kickoff);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(m);
  }
  const days = [...byDay.keys()].sort();

  let dayKey: string;
  if (byDay.has(todayKey)) {
    dayKey = todayKey;
  } else {
    const future = days.find((d) => d > todayKey);
    dayKey = future ?? days[days.length - 1] ?? todayKey;
  }

  const matches = (byDay.get(dayKey) ?? []).sort((a, b) => a.kickoff - b.kickoff);

  // Optional explicit override of the countdown target.
  let overrideMs: number | null = null;
  if (COUNTDOWN_OVERRIDE) {
    const n = Number(COUNTDOWN_OVERRIDE);
    overrideMs = Number.isFinite(n)
      ? n * 1000
      : Number.isFinite(Date.parse(COUNTDOWN_OVERRIDE))
        ? Date.parse(COUNTDOWN_OVERRIDE)
        : null;
  }

  const upcoming = all
    .filter((m) => m.kickoff > now)
    .sort((a, b) => a.kickoff - b.kickoff);
  const nextMatch = upcoming[0] ?? null;
  const nextKickoff = overrideMs ?? nextMatch?.kickoff ?? null;
  const allLocked = matches.length > 0 && matches.every((m) => now >= m.kickoff);

  return { dayKey, matches, nextKickoff, nextMatch, allLocked };
}
