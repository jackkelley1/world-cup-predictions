"use client";

import { useState } from "react";

interface AdminMatch {
  id: string;
  group: string;
  team1: string;
  team2: string;
  status: string;
  score: [number, number] | null;
  kickoffLabel: string;
  override: [number, number] | null;
}

function Row({
  m,
  password,
}: {
  m: AdminMatch;
  password: string;
}) {
  const init = m.override ?? m.score;
  const [home, setHome] = useState(init ? String(init[0]) : "");
  const [away, setAway] = useState(init ? String(init[1]) : "");
  const [msg, setMsg] = useState<string | null>(null);
  const [overridden, setOverridden] = useState(m.override != null);

  async function send(clear: boolean) {
    setMsg(null);
    const res = await fetch("/wc/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        clear
          ? { password, matchId: m.id, clear: true }
          : { password, matchId: m.id, home: Number(home), away: Number(away) },
      ),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setOverridden(!clear);
      setMsg(clear ? "Cleared" : "Saved");
    } else {
      setMsg(data.error ?? "Error");
    }
    setTimeout(() => setMsg(null), 2000);
  }

  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          {m.group} · {m.kickoffLabel}
        </span>
        <span>
          {m.status}
          {m.score ? ` · feed ${m.score[0]}-${m.score[1]}` : ""}
          {overridden ? " · overridden" : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm">{m.team1}</span>
        <input
          value={home}
          onChange={(e) => setHome(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          className="h-9 w-10 rounded-md border border-border bg-surface-2 text-center"
        />
        <span className="text-muted">–</span>
        <input
          value={away}
          onChange={(e) => setAway(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          className="h-9 w-10 rounded-md border border-border bg-surface-2 text-center"
        />
        <span className="min-w-0 flex-1 truncate text-right text-sm">{m.team2}</span>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs">
        {msg && <span className="text-accent">{msg}</span>}
        <button
          onClick={() => send(false)}
          disabled={home === "" || away === ""}
          className="rounded-full bg-accent px-3 py-1 font-semibold text-[#04150d] disabled:opacity-50"
        >
          Override
        </button>
        <button
          onClick={() => send(true)}
          className="rounded-full border border-border px-3 py-1 text-muted hover:text-foreground"
        >
          Clear
        </button>
      </div>
    </li>
  );
}

export default function AdminClient({ matches }: { matches: AdminMatch[] }) {
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");

  const filtered = matches.filter((m) =>
    `${m.team1} ${m.team2} ${m.group}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div>
      <h2 className="mb-1 text-lg font-bold">Admin · score overrides</h2>
      <p className="mb-4 text-sm text-muted">
        Backstop for when the live feed is wrong or down. Overrides take priority
        in scoring.
      </p>
      <div className="mb-4 flex flex-col gap-2">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by team or group…"
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
        />
      </div>
      <ul className="flex flex-col gap-2">
        {filtered.map((m) => (
          <Row key={m.id} m={m} password={password} />
        ))}
      </ul>
    </div>
  );
}
