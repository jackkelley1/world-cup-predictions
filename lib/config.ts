export const APP_NAME = "WC Scoreline";

export const APP_TAGLINE = "World Cup score predictions";

// Public URL used in the shareable picks block and link previews.
export const SHARE_URL =
  process.env.NEXT_PUBLIC_SHARE_URL ?? "www.jtmk.dev/wc";

// Timezone used to group matches into "days" and to render kickoff times.
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Los_Angeles";

// Optional hard override (ISO string or unix-seconds) for the lock countdown target.
export const COUNTDOWN_OVERRIDE =
  process.env.NEXT_PUBLIC_COUNTDOWN_OVERRIDE ?? "";

export const UID_COOKIE = "wc_uid";

/** Post-kickoff window to edit picks for the first match of the day. */
export const FIRST_MATCH_GRACE_MS = 10 * 60 * 1000;
