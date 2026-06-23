# Scoreline

A simple, shareable web app for predicting daily World Cup scores. Sign in with
just your name, lock in score predictions before kickoff, and climb a live
leaderboard. Served at `www.jtmk.dev/wc`.

## How it works

- **Predict** today's matches (with flags) by entering a score for each. The
  earliest upcoming match drives a live **countdown to lock**.
- A match **locks at kickoff** — only your last prediction before kickoff counts.
- **Share** your picks as a copyable flag-emoji block for Slack/iMessage.
- A live **Leaderboard** tab ranks everyone by points, refreshing every ~30s.

### Scoring (per match, highest tier only)

| Points | Result |
| ------ | ------ |
| 3 | Exact score (you said 2-1, it ends 2-1) |
| 2 | Right winner **and** goal difference (2-1 vs 3-2) |
| 1 | Right result only (correct winner, or correctly called a draw) |
| 0 | Wrong result |

## Data source

Live match data, statuses, scores, kickoff times, and flags come from the free,
keyless [`wcup2026.org`](https://wcup2026.org) API (built on the public-domain
[openfootball](https://github.com/openfootball/worldcup.json) dataset, with a
live server layer). Responses are cached ~30s with a last-good fallback to the
openfootball schedule. The `/wc/admin` page is a manual score-override backstop.

## Local development

```bash
npm install
cp .env.example .env.local   # optional; defaults work out of the box
npm run dev                  # http://localhost:3000/wc
```

Without `DATABASE_URL`, data is stored in a local JSON file under `.data/`
(development only). The admin password defaults to `letmein` if `ADMIN_PASS` is
unset.

## Deployment (Vercel)

1. Provision Postgres (Vercel Postgres / Neon) and set `DATABASE_URL`
   (tables are created automatically on first use).
2. Set env vars from `.env.example` (`ADMIN_PASS`, `APP_TIMEZONE`, etc.).
3. Deploy. Point `www.jtmk.dev` at the project; the app lives at `/wc`
   (`/` redirects to `/wc`).

## Tech

Next.js (App Router) · TypeScript · Tailwind CSS · Postgres (`pg`).
