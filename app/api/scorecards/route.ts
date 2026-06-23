import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { getMatches, getMatchday, isLocked } from "@/lib/matches";
import { resolveUser } from "@/lib/identity";
import { formatDayLabel, formatKickoff } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const store = getStore();
  const [all, predictions, names] = await Promise.all([
    getMatches(),
    store.getAllPredictions(),
    store.allUserNames(),
  ]);

  const { matches, dayKey } = getMatchday(all);
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
