import type { MatchStatus } from "@/lib/matches";
import type { PkSide } from "@/lib/knockout";

export interface ClientMatch {
  id: string;
  group: string;
  round: string;
  isKnockout: boolean;
  team1: string;
  team2: string;
  flag1: string | null;
  flag2: string | null;
  status: MatchStatus;
  score: [number, number] | null;
  pkWinner: PkSide | null;
  liveMinute: number | null;
  kickoff: number;
  kickoffLabel: string;
  ground: string;
}

export type PickEntry = {
  home: string;
  away: string;
  pkWinner: PkSide | null;
};

export interface NextLock {
  team1: string;
  team2: string;
  kickoff: number;
  label: string;
}
