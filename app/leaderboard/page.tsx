import LeaderboardClient from "./LeaderboardClient";
import Scorecards from "./Scorecards";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  return (
    <>
      <LeaderboardClient />
      <Scorecards />
    </>
  );
}
