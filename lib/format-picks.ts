import { flagEmojiForTeam } from "./flags";
import type { PkSide } from "./knockout";

export function pensSuffix(
  pkWinner: PkSide | null | undefined,
  team1: string,
  team2: string,
  flag1: string | null,
  flag2: string | null,
): string {
  if (!pkWinner) return "";
  const team = pkWinner === "home" ? team1 : team2;
  const flag = pkWinner === "home" ? flag1 : flag2;
  return ` (pens ${flagEmojiForTeam(team, flag)})`;
}

export function formatPickLine(
  home: number | string,
  away: number | string,
  team1: string,
  team2: string,
  flag1: string | null,
  flag2: string | null,
  pkWinner?: PkSide | null,
): string {
  const f1 = flagEmojiForTeam(team1, flag1);
  const f2 = flagEmojiForTeam(team2, flag2);
  return `${f1} ${home}-${away} ${f2}${pensSuffix(pkWinner, team1, team2, flag1, flag2)}`;
}
