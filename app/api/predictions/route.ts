import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { resolveUser, UID_COOKIE, UID_COOKIE_OPTS } from "@/lib/identity";
import { isKnockoutMatch, type PkSide } from "@/lib/knockout";
import {
  firstMatchGraceId,
  getMatchById,
  getMatches,
  isLocked,
} from "@/lib/matches";
import { tzDateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

function parsePkWinner(raw: unknown): PkSide | null {
  if (raw === "home" || raw === "away") return raw;
  return null;
}

function isTiedScore(home: number, away: number): boolean {
  return home === away;
}

export async function GET(req: NextRequest) {
  const { user, healCookie } = await resolveUser(req);
  if (!user) return NextResponse.json({ predictions: [] });
  const store = getStore();
  const preds = await store.getPredictionsForUser(user.id);
  const res = NextResponse.json({
    predictions: preds.map((p) => ({
      matchId: p.matchId,
      home: p.home,
      away: p.away,
      pkWinner: p.pkWinner,
    })),
  });
  if (healCookie) res.cookies.set(UID_COOKIE, user.id, UID_COOKIE_OPTS);
  return res;
}

export async function POST(req: NextRequest) {
  const { user, healCookie } = await resolveUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Enter your name first." },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    matchId?: unknown;
    home?: unknown;
    away?: unknown;
    pkWinner?: unknown;
  };
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const home = Number(body.home);
  const away = Number(body.away);
  const pkWinner = parsePkWinner(body.pkWinner);

  if (
    !matchId ||
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 99 ||
    away > 99
  ) {
    return NextResponse.json({ error: "Invalid prediction." }, { status: 400 });
  }

  const match = await getMatchById(matchId);
  if (!match) {
    return NextResponse.json({ error: "Unknown match." }, { status: 404 });
  }
  const all = await getMatches();
  const dayMatches = all.filter(
    (m) => tzDateKey(m.kickoff) === tzDateKey(match.kickoff),
  );
  const graceMatchId = firstMatchGraceId(dayMatches);
  if (isLocked(match, Date.now(), { graceMatchId })) {
    return NextResponse.json(
      { error: "This match is locked." },
      { status: 409 },
    );
  }

  const tied = isTiedScore(home, away);
  const knockout = match.isKnockout || isKnockoutMatch(match.round, match.group);
  if (knockout && tied && !pkWinner) {
    return NextResponse.json(
      { error: "Pick a penalty-shootout winner for a tied knockout score." },
      { status: 400 },
    );
  }
  if (!tied && pkWinner) {
    return NextResponse.json(
      { error: "Penalty winner only applies to tied scores." },
      { status: 400 },
    );
  }

  const store = getStore();
  await store.upsertPrediction(
    user.id,
    matchId,
    home,
    away,
    tied ? pkWinner : null,
  );

  const res = NextResponse.json({ ok: true });
  if (healCookie) res.cookies.set(UID_COOKIE, user.id, UID_COOKIE_OPTS);
  return res;
}
