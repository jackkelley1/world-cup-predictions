/** True for knockout rounds (not group-stage matchdays). */
export function isKnockoutMatch(round: string, group: string): boolean {
  if (/^matchday\s+\d+/i.test(round.trim())) return false;
  if (group.trim()) return false;
  if (!round.trim()) return false;
  return true;
}

export type PkSide = "home" | "away";

export function pkWinnerFromPenalties(
  pens: [number, number],
): PkSide | null {
  if (pens[0] > pens[1]) return "home";
  if (pens[1] > pens[0]) return "away";
  return null;
}

export function pkWinnerFromTeamName(
  winner: string,
  team1: string,
  team2: string,
): PkSide | null {
  const w = winner.trim().toLowerCase();
  if (!w) return null;
  if (team1.trim().toLowerCase() === w) return "home";
  if (team2.trim().toLowerCase() === w) return "away";
  return null;
}
