import PredictClient from "./PredictClient";
import { getMatches, getMatchday } from "@/lib/matches";
import { formatDayLabel, formatKickoff, tzDateKey } from "@/lib/time";
import type { ClientMatch, NextLock } from "./types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PredictPage() {
  const all = await getMatches();
  const md = getMatchday(all);
  const dayLabel = formatDayLabel(md.dayKey);

  const matches: ClientMatch[] = md.matches.map((m) => ({
    id: m.id,
    group: m.group,
    round: m.round,
    isKnockout: m.isKnockout,
    team1: m.team1,
    team2: m.team2,
    flag1: m.flag1,
    flag2: m.flag2,
    status: m.status,
    score: m.score,
    pkWinner: m.pkWinner,
    liveMinute: m.liveMinute,
    kickoff: m.kickoff,
    kickoffLabel: formatKickoff(m.kickoff),
    ground: m.ground,
  }));

  const nextLock: NextLock | null = md.nextMatch
    ? {
        team1: md.nextMatch.team1,
        team2: md.nextMatch.team2,
        kickoff: md.nextMatch.kickoff,
        label: `${formatDayLabel(tzDateKey(md.nextMatch.kickoff))} ${formatKickoff(
          md.nextMatch.kickoff,
        )}`,
      }
    : null;

  return (
    <PredictClient
      matches={matches}
      dayLabel={dayLabel}
      nextKickoff={md.nextKickoff}
      nextLock={nextLock}
    />
  );
}
