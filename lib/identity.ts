import type { NextRequest } from "next/server";
import { UID_COOKIE } from "./config";
import { getStore, type User } from "./db";

export function ipFromRequest(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

export const UID_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

/**
 * Resolve the current user. Cookie is the primary identity (per-browser); if
 * there's no cookie we fall back to the most recent user from the same IP.
 * Returns whether the cookie should be (re)set to heal IP-only matches.
 */
export async function resolveUser(
  req: NextRequest,
): Promise<{ user: User | null; healCookie: boolean }> {
  const store = getStore();
  const uid = req.cookies.get(UID_COOKIE)?.value;
  if (uid) {
    const user = await store.getUserById(uid);
    if (user) return { user, healCookie: false };
  }
  const ip = ipFromRequest(req);
  if (ip) {
    const byIp = await store.getUserByIp(ip);
    if (byIp) return { user: byIp, healCookie: true };
  }
  return { user: null, healCookie: false };
}

export { UID_COOKIE };
