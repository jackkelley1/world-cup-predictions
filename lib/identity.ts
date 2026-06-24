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
 * Resolve the current user strictly by the per-browser cookie.
 *
 * We deliberately do NOT fall back to IP matching. People on the same network
 * (home wifi, office, mobile carrier CGNAT) share one public IP, so adopting
 * "the most recent user on this IP" merges distinct people into a single
 * account — their predictions bleed across devices and the name form can rename
 * the wrong account. Identity is established only when a user enters their name
 * (see /api/name), which sets the cookie.
 *
 * `healCookie` is retained for the existing call sites but is always false now.
 */
export async function resolveUser(
  req: NextRequest,
): Promise<{ user: User | null; healCookie: boolean }> {
  const uid = req.cookies.get(UID_COOKIE)?.value;
  if (uid) {
    const user = await getStore().getUserById(uid);
    if (user) return { user, healCookie: false };
  }
  return { user: null, healCookie: false };
}

export { UID_COOKIE };
