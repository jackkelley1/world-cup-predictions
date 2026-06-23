import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASS } from "@/lib/server-config";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    password?: unknown;
    matchId?: unknown;
    home?: unknown;
    away?: unknown;
    clear?: unknown;
  };

  if (body.password !== ADMIN_PASS) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  if (!matchId) {
    return NextResponse.json({ error: "Missing match." }, { status: 400 });
  }

  const store = getStore();

  if (body.clear) {
    await store.clearOverride(matchId);
    return NextResponse.json({ ok: true, cleared: true });
  }

  const home = Number(body.home);
  const away = Number(body.away);
  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 99 ||
    away > 99
  ) {
    return NextResponse.json({ error: "Invalid score." }, { status: 400 });
  }

  await store.setOverride(matchId, home, away);
  return NextResponse.json({ ok: true });
}
