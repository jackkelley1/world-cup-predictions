import type { MatchStatus } from "@/lib/matches";

export interface ClientMatch {
  id: string;
  group: string;
  round: string;
  team1: string;
  team2: string;
  flag1: string | null;
  flag2: string | null;
  status: MatchStatus;
  score: [number, number] | null;
  liveMinute: number | null;
  kickoff: number;
  kickoffLabel: string;
  ground: string;
}

export interface NextLock {
  team1: string;
  team2: string;
  kickoff: number;
  label: string;
}
