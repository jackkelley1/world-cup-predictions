import AdminClient from "./AdminClient";
import { getStore } from "@/lib/db";
import { getMatches } from "@/lib/matches";
import { formatKickoff } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [all, overrides] = await Promise.all([
    getMatches(),
    getStore().getOverrides(),
  ]);

  const matches = all.map((m) => ({
    id: m.id,
    group: m.group,
    team1: m.team1,
    team2: m.team2,
    status: m.status,
    score: m.score,
    kickoffLabel: formatKickoff(m.kickoff),
    override: overrides[m.id] ?? null,
  }));

  return <AdminClient matches={matches} />;
}
