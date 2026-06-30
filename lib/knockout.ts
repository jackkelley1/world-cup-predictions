/** Knockout round names in the wcup2026 / openfootball feeds. */
const KNOCKOUT_ROUND =
  /round of (16|32)|quarter-?finals?|semi-?finals?|third place|(^|\s)final(\s|$)/i;

/** Group-stage labels — never treated as knockouts. */
const GROUP_STAGE_GROUP = /^group\s+[a-l]\b/i;
const GROUP_STAGE_ROUND = /^matchday\s+\d+/i;

/** True for knockout rounds (not group-stage matchdays). */
export function isKnockoutMatch(round: string, group: string): boolean {
  const r = round.trim();
  const g = group.trim();

  if (KNOCKOUT_ROUND.test(r) || KNOCKOUT_ROUND.test(g)) return true;
  if (GROUP_STAGE_GROUP.test(g) || GROUP_STAGE_ROUND.test(r)) return false;

  // openfootball knockouts: round set, group absent
  if (r && !g) return true;

  return false;
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
