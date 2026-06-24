"use client";

import { useEffect, useState } from "react";

interface Entry {
  userId: string;
  name: string;
  points: number;
  exact: number;
  scored: number;
  rank: number;
}

interface Board {
  entries: Entry[];
  finishedCount: number;
}

type Scope = "today" | "alltime";

interface BoardResponse {
  scopes: Record<Scope, Board>;
  playerCount: number;
}

const SCOPES: { id: Scope; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "alltime", label: "All-time" },
];

function medal(rank: number) {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
}

export default function LeaderboardClient() {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [scope, setScope] = useState<Scope>("today");
  const [meId, setMeId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const res = await fetch("/wc/api/leaderboard", { cache: "no-store" });
      const d = (await res.json()) as BoardResponse;
      if (active) {
        setData(d);
        setUpdatedAt(Date.now());
      }
    }
    fetch("/wc/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => active && setMeId(d.userId ?? null))
      .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
        Loading the board…
      </p>
    );
  }

  const board = data.scopes[scope];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Leaderboard</h2>
        <span className="text-xs text-muted">
          {data.playerCount} player{data.playerCount === 1 ? "" : "s"} ·{" "}
          {board.finishedCount} match{board.finishedCount === 1 ? "" : "es"} scored
        </span>
      </div>

      <nav className="mb-4 flex gap-1 rounded-full border border-border bg-surface p-1">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              scope === s.id
                ? "bg-accent text-[#04150d]"
                : "text-muted hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {board.entries.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          {scope === "today"
            ? "No scores yet today. Once today's matches finish, the board lights up."
            : "No scores yet. Once matches finish, the board lights up."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {board.entries.map((e) => {
            const mine = e.userId === meId;
            return (
              <li
                key={e.userId}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                  mine
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface"
                }`}
              >
                <span className="w-8 text-center text-lg font-bold tabular-nums">
                  {medal(e.rank) ?? e.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {e.name}
                  {mine && <span className="ml-2 text-xs text-accent">you</span>}
                </span>
                <span className="text-xs text-muted">{e.exact} exact</span>
                <span className="w-14 text-right text-lg font-bold tabular-nums">
                  {e.points}
                  <span className="ml-1 text-xs font-normal text-muted">pts</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        Auto-refreshes every 30s
        {updatedAt
          ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}`
          : ""}
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-4 text-xs leading-5 text-muted">
        <p className="mb-1 font-semibold text-foreground">Scoring</p>
        <p>3 pts — exact score · 2 pts — right winner &amp; goal difference</p>
        <p>1 pt — right result only · 0 pts — wrong result (highest tier only)</p>
      </div>
    </div>
  );
}
