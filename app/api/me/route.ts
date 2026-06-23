import { NextRequest, NextResponse } from "next/server";
import { resolveUser, UID_COOKIE, UID_COOKIE_OPTS } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, healCookie } = await resolveUser(req);
  const res = NextResponse.json({
    userId: user?.id ?? null,
    name: user?.name ?? null,
  });
  if (user && healCookie) res.cookies.set(UID_COOKIE, user.id, UID_COOKIE_OPTS);
  return res;
}
