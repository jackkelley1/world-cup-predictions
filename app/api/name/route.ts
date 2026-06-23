import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { ipFromRequest, UID_COOKIE, UID_COOKIE_OPTS } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 40) {
    return NextResponse.json(
      { error: "Name must be 1-40 characters." },
      { status: 400 },
    );
  }

  const store = getStore();
  const ip = ipFromRequest(req);
  const uid = req.cookies.get(UID_COOKIE)?.value;

  let userId: string;
  const existing = uid ? await store.getUserById(uid) : null;
  if (existing) {
    await store.updateUserName(existing.id, name);
    userId = existing.id;
  } else {
    const created = await store.createUser(name, ip);
    userId = created.id;
  }

  const res = NextResponse.json({ userId, name });
  res.cookies.set(UID_COOKIE, userId, UID_COOKIE_OPTS);
  return res;
}
