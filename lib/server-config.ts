import "server-only";

// Password gate for the admin score-override page. Server-only so it is never
// shipped to the client bundle.
export const ADMIN_PASS = process.env.ADMIN_PASS ?? "letmein";
