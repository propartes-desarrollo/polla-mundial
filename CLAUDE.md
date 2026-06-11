# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Polla Mundialista FIFA 2026** — a private sports prediction platform for the 2026 FIFA World Cup. Users register via invitation tokens, submit match predictions, and compete for prize pool money. Hosted entirely on Cloudflare.

## Monorepo Structure

```
apps/
  api/   — Cloudflare Workers backend (Hono + D1), worker name "polla-mundial"
  web/   — Next.js 15 frontend, static export (output: 'export') for Cloudflare Pages
```

npm workspaces: run `npm install` at the repo root. Node 20 (`.nvmrc`).

## Commands

### API (`apps/api`)
```bash
npm run dev                # Wrangler local dev server (emulates D1), port 8787
npm run typecheck          # tsc --noEmit
npm run db:migrate         # apply migrations to local D1
npm run db:migrate:remote  # apply migrations to production D1
npx tsx src/scoring.test.ts  # scoring unit tests (custom harness, no runner)
```
Local secrets go in `apps/api/.dev.vars` (gitignored; see `.dev.vars.example`).

### Web (`apps/web`)
```bash
npm run dev    # Next.js dev server, port 3000
npm run build  # static export -> out/ (this is what Pages runs)
npm run lint
```

## Deployment

Cloudflare native Git integration (NO GitHub Actions): every push to `main` triggers
Workers Builds (root `apps/api`, deploy `npx wrangler deploy`) and Pages (root `apps/web`,
build `npm run build`, output `out`, framework preset **None**). See DEPLOYMENT.md.

Web needs env var `NEXT_PUBLIC_API_URL` (Pages dashboard) pointing at the Worker URL.

## Architecture

### Backend (Cloudflare Workers)

- **Framework**: Hono. All routes in [apps/api/src/index.ts](apps/api/src/index.ts).
- **Auth**: JWT (HS256 via `hono/jwt`) in [apps/api/src/auth.ts](apps/api/src/auth.ts); passwords hashed with PBKDF2/Web Crypto (bcrypt unavailable in Workers). Seeded admin (`0000000000`/`admin123`) uses a plaintext fallback in `verifyPassword`.
- **Middleware**: `requireAuth` (Bearer token) on `/api/me`, `/api/matches`, `/api/predictions`; plus `requireAdmin` on `/api/admin/*`.
- **Database**: D1 (SQLite). Migrations in `apps/api/migrations/` (schema + idempotent seed). Binding `DB`.
- **Cron**: every 30 min — syncs teams/matches from the football provider into D1, recalculates prediction points, rebuilds rankings.

### Football providers (swappable)

Interface `FootballProvider` in [apps/api/src/providers/football.ts](apps/api/src/providers/football.ts). Selected by `FOOTBALL_PROVIDER` var:
- `apisports` (default) — api-sports.io, header `x-apisports-key`, secret `FOOTBALL_API_KEY`. League 1 = World Cup. **Free plan only covers seasons 2022–2024** (2026 needs paid plan). Returns HTTP 200 with an `errors` object on failures — the provider throws on it.
- `footballdata` — football-data.org v4, header `X-Auth-Token`, secret `FOOTBALL_DATA_API_KEY`, competition `WC`. IDs prefixed `team_fd_`/`match_fd_` to avoid collisions with api-sports ids.

`WORLD_CUP_SEASON` var controls the season (2022 for testing, 2026 for the real event). `mapRoundToPhaseId` in index.ts maps both providers' round/stage strings to phase ids.

### Scoring ([apps/api/src/scoring.ts](apps/api/src/scoring.ts))

Phase-dependent points: groups 3 (winner) / +2 (goal diff) / 5 (exact); knockouts scale up to final 15/25. Special predictions: champion 30, runner-up 15, top scorer 20 ([apps/api/src/prizes.ts](apps/api/src/prizes.ts) splits 95% of the pool).

### Frontend (static export — no server features)

All data fetching is client-side (`"use client"` + `useEffect`) through [apps/web/src/lib/api.ts](apps/web/src/lib/api.ts), which stores the JWT in localStorage. Pages: `/` (landing), `/login` (login + invite registration, reads `?invite=` from `window.location`), `/ranking` (public), `/portal` (user predictions), `/admin` (stats, phases, sync, invitations). Role guards run client-side via `getUser()`.

**Constraint**: `next.config.mjs` uses `output: 'export'` — never add server components/actions, `next/image` optimization, or API routes; they break the build. Avoid `useSearchParams` without Suspense (use `window.location` instead).

## Key Constraints

- Workers runtime is not Node — Web APIs only in `apps/api`.
- api-sports free plan: season 2022–2024 only; errors come embedded in HTTP-200 bodies.
- football-data.org free tier: ~10 req/min rate limit.
- The Worker name in wrangler.toml must stay `polla-mundial` (matches the Cloudflare Workers Builds project).
