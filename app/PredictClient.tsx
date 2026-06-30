"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Countdown from "./Countdown";
import SharePicks from "./SharePicks";
import ShareResults from "./ShareResults";
import type { ClientMatch, NextLock, PickEntry } from "./types";
import { flagEmojiForTeam } from "@/lib/flags";
import type { PkSide } from "@/lib/knockout";
import { pensSuffix } from "@/lib/format-picks";

type Picks = Record<string, PickEntry>;

function isTiedPick(p: PickEntry | undefined): boolean {
  if (!p || p.home === "" || p.away === "") return false;
  return Number(p.home) === Number(p.away);
}

function statusBadge(m: ClientMatch, locked: boolean) {
  if (m.status === "live") {
    return (
      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-400">
        LIVE{m.liveMinute != null ? ` ${m.liveMinute}'` : ""}
      </span>
    );
  }
  if (m.status === "finished") {
    return (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
        FT
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        locked ? "bg-surface-2 text-muted" : "bg-accent/15 text-accent"
      }`}
    >
      {locked ? "Locked" : m.kickoffLabel}
    </span>
  );
}

function TeamSide({
  name,
  flag,
  align,
}: {
  name: string;
  flag: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {flag ? (
        <img
          src={flag}
          alt=""
          width={28}
          height={20}
          className="h-5 w-7 flex-shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span className="text-lg">🏳️</span>
      )}
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ariaLabel: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onKeyDown={(e) => {
        if (e.key.length === 1 && !/[0-9]/.test(e.key) && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
        }
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
        onChange(v);
      }}
      placeholder="–"
      className="h-11 w-11 rounded-lg border border-border bg-surface-2 text-center text-lg font-bold text-foreground outline-none focus:border-accent disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface disabled:text-muted disabled:opacity-50"
    />
  );
}

function PkSelector({
  match,
  value,
  onChange,
  disabled,
}: {
  match: ClientMatch;
  value: PkSide | null;
  onChange: (side: PkSide) => void;
  disabled: boolean;
}) {
  const options: { side: PkSide; name: string; flag: string | null }[] = [
    { side: "home", name: match.team1, flag: match.flag1 },
    { side: "away", name: match.team2, flag: match.flag2 },
  ];

  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <p className="mb-2 text-center text-xs font-medium text-foreground">
        Who wins if it goes to penalties? <span className="text-red-400">*</span>
      </p>
      <div className="flex gap-2">
        {options.map((opt) => {
          const selected = value === opt.side;
          return (
            <button
              key={opt.side}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.side)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-accent bg-accent/20 text-foreground"
                  : "border-border bg-surface-2 text-muted hover:border-accent/50 hover:text-foreground"
              }`}
            >
              <span>{flagEmojiForTeam(opt.name, opt.flag)}</span>
              <span className="truncate">{opt.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PredictClient({
  matches,
  dayLabel,
  nextKickoff,
  nextLock,
}: {
  matches: ClientMatch[];
  dayLabel: string;
  nextKickoff: number | null;
  nextLock: NextLock | null;
}) {
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [nameInput, setNameInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [picks, setPicks] = useState<Picks>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadPredictions = useCallback(async () => {
    const res = await fetch("/wc/api/predictions", { cache: "no-store" });
    const data = await res.json();
    const next: Picks = {};
    for (const p of data.predictions ?? []) {
      next[p.matchId] = {
        home: String(p.home),
        away: String(p.away),
        pkWinner: p.pkWinner ?? null,
      };
    }
    setPicks(next);
    setDirty(false);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/wc/api/me", { cache: "no-store" });
      const data = await res.json();
      setName(data.name ?? null);
      if (data.name) await loadPredictions();
    })();
  }, [loadPredictions]);

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const res = await fetch("/wc/api/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      setName(data.name);
      setEditingName(false);
      await loadPredictions();
    }
  }

  function setPick(id: string, side: "home" | "away", v: string) {
    setDirty(true);
    setPicks((prev) => {
      const cur = prev[id] ?? { home: "", away: "", pkWinner: null };
      const next = { ...cur, [side]: v };
      const home = side === "home" ? v : cur.home;
      const away = side === "away" ? v : cur.away;
      if (home !== "" && away !== "" && Number(home) !== Number(away)) {
        next.pkWinner = null;
      }
      return { ...prev, [id]: next };
    });
  }

  function setPkWinner(id: string, side: PkSide) {
    setDirty(true);
    setPicks((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { home: "", away: "", pkWinner: null }), pkWinner: side },
    }));
  }

  const isLocked = useCallback(
    (m: ClientMatch) => now >= m.kickoff || m.status !== "upcoming",
    [now],
  );

  function pickReady(m: ClientMatch, p: PickEntry | undefined): boolean {
    if (!p || p.home === "" || p.away === "") return false;
    if (m.isKnockout && Number(p.home) === Number(p.away) && !p.pkWinner) {
      return false;
    }
    return true;
  }

  async function saveAll() {
    if (!name) {
      setEditingName(true);
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    let count = 0;
    let failed = 0;
    for (const m of matches) {
      if (isLocked(m)) continue;
      const p = picks[m.id];
      if (!pickReady(m, p)) continue;
      const res = await fetch("/wc/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: m.id,
          home: Number(p.home),
          away: Number(p.away),
          pkWinner: p.pkWinner,
        }),
      });
      if (res.ok) count++;
      else failed++;
    }
    setSaving(false);
    if (failed === 0) setDirty(false);
    setSaveMsg(
      failed > 0
        ? `Saved ${count}, ${failed} failed (locked or missing PK pick?)`
        : count > 0
          ? `Saved ${count} pick${count === 1 ? "" : "s"} ✓`
          : "Nothing to save",
    );
    setTimeout(() => setSaveMsg(null), 2500);
  }

  const openCount = useMemo(
    () => matches.filter((m) => !isLocked(m)).length,
    [matches, isLocked],
  );

  const needsName = !name;

  return (
    <div>
      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        {nextKickoff && now < nextKickoff ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-muted">
              {nextLock ? "Next pick locks in" : "Next kickoff in"}
            </span>
            <span className="text-3xl font-bold text-accent">
              <Countdown
                key={tick}
                target={nextKickoff}
                onElapsed={() => setTick((t) => t + 1)}
              />
            </span>
            {nextLock && (
              <span className="text-sm text-muted">
                {nextLock.team1} v {nextLock.team2} · {nextLock.label}
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold">Picks are locked</span>
            <span className="text-sm text-muted">
              No more upcoming matches to predict right now.
            </span>
          </div>
        )}
      </section>

      <section className="mb-5">
        {name && !editingName ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">
            <span>
              Playing as <span className="font-semibold">{name}</span>
            </span>
            <button
              className="text-accent hover:underline"
              onClick={() => {
                setNameInput(name);
                setEditingName(true);
              }}
            >
              change
            </button>
          </div>
        ) : (
          <form
            onSubmit={submitName}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
          >
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={40}
              placeholder="Enter your name to play"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-[#04150d] hover:bg-accent-strong"
            >
              {name ? "Save" : "Start"}
            </button>
          </form>
        )}
      </section>

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{dayLabel}</h2>
        <span className="text-xs text-muted">
          {matches.length} match{matches.length === 1 ? "" : "es"}
        </span>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted">
          No matches scheduled. Check back on the next match day.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {matches.map((m) => {
            const locked = isLocked(m);
            const p = picks[m.id] ?? { home: "", away: "", pkWinner: null };
            const showPk =
              m.isKnockout && isTiedPick(p) && !locked && !needsName;
            return (
              <li
                key={m.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  locked
                    ? "border-border/50 bg-surface/40"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-3 flex items-center justify-between text-xs text-muted">
                  <span>
                    {m.group || m.round}
                    {m.ground ? ` · ${m.ground}` : ""}
                  </span>
                  {statusBadge(m, locked)}
                </div>
                <div className="flex items-center gap-3">
                  <TeamSide name={m.team1} flag={m.flag1} align="left" />
                  <div className="flex items-center gap-1.5">
                    <ScoreInput
                      value={p.home}
                      disabled={locked || needsName}
                      onChange={(v) => setPick(m.id, "home", v)}
                      ariaLabel={`${m.team1} score`}
                    />
                    <span className="text-muted">–</span>
                    <ScoreInput
                      value={p.away}
                      disabled={locked || needsName}
                      onChange={(v) => setPick(m.id, "away", v)}
                      ariaLabel={`${m.team2} score`}
                    />
                  </div>
                  <TeamSide name={m.team2} flag={m.flag2} align="right" />
                </div>
                {showPk && (
                  <PkSelector
                    match={m}
                    value={p.pkWinner}
                    onChange={(side) => setPkWinner(m.id, side)}
                    disabled={locked || needsName}
                  />
                )}
                {m.score && (
                  <div className="mt-3 text-center text-xs text-muted">
                    {m.status === "live" ? "Live" : "Full time"}:{" "}
                    <span className="font-semibold text-foreground">
                      {m.score[0]} – {m.score[1]}
                      {m.pkWinner
                        ? pensSuffix(
                            m.pkWinner,
                            m.team1,
                            m.team2,
                            m.flag1,
                            m.flag2,
                          )
                        : ""}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {openCount > 0 && (
        <div className="sticky bottom-4 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/95 p-3 backdrop-blur">
          <span className="text-sm text-muted">
            {saveMsg ?? `${openCount} match${openCount === 1 ? "" : "es"} open`}
          </span>
          <button
            onClick={saveAll}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#04150d] hover:bg-accent-strong disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save picks"}
          </button>
        </div>
      )}

      <SharePicks
        matches={matches}
        picks={picks}
        dayLabel={dayLabel}
        canCopy={!dirty}
      />

      {matches.some((m) => m.status === "finished" && m.score) && (
        <ShareResults matches={matches} picks={picks} dayLabel={dayLabel} />
      )}
    </div>
  );
}
