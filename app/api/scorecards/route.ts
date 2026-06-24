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

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = getStore();
  const [all, predictions, names] = await Promise.all([
    getMatches(),
    store.getAllPredictions(),
    store.allUserNames(),
  ]);

  const now = Date.now();

  // Group every match by its calendar day (app timezone).
  const byDay = new Map<string, Match[]>();
  for (const m of all) {
    const key = tzDateKey(m.kickoff);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(m);
  }

  // Days the user can browse: any day that has already started, plus the
  // current matchday (so today is always available even before kickoff).
  const defaultDay = getMatchday(all, now).dayKey;
  const selectable = [...byDay.keys()]
    .filter(
      (k) => k === defaultDay || byDay.get(k)!.some((m) => now >= m.kickoff),
    )
    .sort();

  // Resolve the requested day; fall back to the most recent selectable day.
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

  // Group the day's predictions by user. Fully open: include all picks.
  const byUser = new Map<string, Record<string, [number, number]>>();
  for (const p of predictions) {
    if (!dayIds.has(p.matchId)) continue;
    const picks = byUser.get(p.userId) ?? {};
    picks[p.matchId] = [p.home, p.away];
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
      locked: isLocked(m),
      kickoffLabel: formatKickoff(m.kickoff),
    })),
    cards,
  });
}
