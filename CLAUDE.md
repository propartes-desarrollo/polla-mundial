# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Polla Mundialista FIFA 2026** — a private sports prediction platform for the 2026 FIFA World Cup. Users register via invitation tokens, submit match predictions, and compete for prize pool money. Hosted entirely on Cloudflare's edge platform.

## Monorepo Structure

```
apps/
  api/   — Cloudflare Workers backend (Hono + D1)
  web/   — Next.js 15 frontend (App Router + shadcn/ui)
```

All commands must be run from within the relevant `apps/api` or `apps/web` directory unless noted.

## Commands

### API (`apps/api`)
```bash
npm run dev        # Wrangler local dev server (emulates D1)
npm run deploy     # Deploy to Cloudflare Workers
npm run db:init    # Apply schema.sql to local D1
npm run db:seed    # Seed test data via seed.sql
```

Tests are in `src/scoring.test.ts` and use a custom harness (no test runner dependency). Run with:
```bash
npx tsx src/scoring.test.ts
```

### Web (`apps/web`)
```bash
npm run dev    # Next.js dev server on port 3000
npm run build  # Production build
npm run lint   # ESLint
```

## Architecture

### Backend (Cloudflare Workers)

- **Framework**: Hono.js — all routes in [apps/api/src/index.ts](apps/api/src/index.ts)
- **Database**: Cloudflare D1 (SQLite). Schema in [apps/api/schema.sql](apps/api/schema.sql). Binding name is `DB`.
- **Cron**: Runs every 30 minutes (`*/30 * * * *`) to sync live match data from API-Sports, recalculate scores, and update rankings.
- **Auth**: JWT via `JWT_SECRET` env var; invitation-based registration via token.
- **Environment variables**: `JWT_SECRET`, `FOOTBALL_API_KEY`, `FRONTEND_URL` — configured in `wrangler.toml` and Cloudflare dashboard.

**Data flow (cron)**:
```
ApiSportsProvider → fetch live results → scoring.ts → update predictions/rankings → prizes.ts
```

**Football provider abstraction** ([apps/api/src/providers/football.ts](apps/api/src/providers/football.ts)): interface that `ApiSportsProvider` implements. Swap for a mock during local dev if needed.

### Scoring System ([apps/api/src/scoring.ts](apps/api/src/scoring.ts))

Points vary by tournament phase:
| Outcome | Groups | Knockouts/Final |
|---|---|---|
| Correct winner | 3 | 5–15 |
| Exact score | 5 | 15–25 |
| Goal difference bonus | 2 | — |

Special predictions: Champion (30 pts), Runner-up (15 pts), Top Scorer (20 pts).

### Prize Distribution ([apps/api/src/prizes.ts](apps/api/src/prizes.ts))

95% of pool distributed: 1st (50%), 2nd (20%), 3rd (10%), most exact scores (5%), most correct winners (5%), correct champion (5%), correct top scorer (5%).

### Frontend (Next.js 15 App Router)

- **UI**: shadcn/ui + Radix UI, TailwindCSS, dark mode by default
- **State**: Zustand
- **Animations**: Framer Motion
- **Validation**: Zod
- **Pages**: `/` (home/login), `/ranking` (public leaderboard), `/portal` (user predictions), `/admin` (dashboard)

The frontend calls the deployed Workers API. The API URL is configured via environment variable consumed in Next.js.

## Key Constraints

- The Workers runtime is not Node.js — avoid Node-specific APIs in `apps/api`. Use Web-standard APIs.
- D1 is SQLite; joins and transactions work, but no stored procedures.
- `wrangler.toml` defines local D1 bindings; production bindings are set in the Cloudflare dashboard.
- Next.js 15 uses React 19 — be aware of concurrent features and server/client component boundaries.
