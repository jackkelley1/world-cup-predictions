import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { resolveUser, UID_COOKIE, UID_COOKIE_OPTS } from "@/lib/identity";
import { getMatchById, isLocked } from "@/lib/matches";

export const dynamic = "force-dynamic";

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
  };
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const home = Number(body.home);
  const away = Number(body.away);

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
  if (isLocked(match)) {
    return NextResponse.json(
      { error: "This match is locked." },
      { status: 409 },
    );
  }

  const store = getStore();
  await store.upsertPrediction(user.id, matchId, home, away);

  const res = NextResponse.json({ ok: true });
  if (healCookie) res.cookies.set(UID_COOKIE, user.id, UID_COOKIE_OPTS);
  return res;
}
