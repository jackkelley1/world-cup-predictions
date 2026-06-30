import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import {
  getMatches,
  getMatchday,
  isLocked,
  type Match,
} from "@/lib/matches";
import { resolveUser } from "@/lib/identity";
import { formatDayLabel, formatKickoff, tzDateKey } from "@/lib/time";
import type { PkSide } from "@/lib/knockout";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = getStore();
  const [all, predictions, names] = await Promise.all([
    getMatches(),
    store.getAllPredictions(),
    store.allUserNames(),
  ]);

  const now = Date.now();

  const byDay = new Map<string, Match[]>();
  for (const m of all) {
    const key = tzDateKey(m.kickoff);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(m);
  }

  const defaultDay = getMatchday(all, now).dayKey;
  const selectable = [...byDay.keys()]
    .filter(
      (k) => k === defaultDay || byDay.get(k)!.some((m) => now >= m.kickoff),
    )
    .sort();

  const requested = req.nextUrl.searchParams.get("day");
  const dayKey =
    requested && selectable.includes(requested)
      ? requested
      : (selectable[selectable.length - 1] ?? defaultDay);

  const matches = (byDay.get(dayKey) ?? []).sort(
    (a, b) => a.kickoff - b.kickoff,
  );
  const dayIds = new Set(matches.map((m) => m.id));
  const { user } = await resolveUser(req);

  const byUser = new Map<
    string,
    Record<string, { home: number; away: number; pkWinner: PkSide | null }>
  >();
  for (const p of predictions) {
    if (!dayIds.has(p.matchId)) continue;
    const picks = byUser.get(p.userId) ?? {};
    picks[p.matchId] = {
      home: p.home,
      away: p.away,
      pkWinner: p.pkWinner,
    };
    byUser.set(p.userId, picks);
  }

  const cards = [...byUser.entries()]
    .map(([userId, picks]) => ({
      userId,
      name: names[userId] ?? "Anonymous",
      picks,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    days: selectable.map((k) => ({ key: k, label: formatDayLabel(k) })),
    dayKey,
    dayLabel: matches.length ? formatDayLabel(dayKey) : null,
    meId: user?.id ?? null,
    matches: matches.map((m) => ({
      id: m.id,
      team1: m.team1,
      team2: m.team2,
      flag1: m.flag1,
      flag2: m.flag2,
      status: m.status,
      score: m.score,
      pkWinner: m.pkWinner,
      locked: isLocked(m),
      kickoffLabel: formatKickoff(m.kickoff),
    })),
    cards,
  });
}
