import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ApiSportsFootballProvider } from './providers/ApiSportsProvider'
import { FootballProvider } from './providers/football'
import { calculatePoints, PhaseType } from './scoring'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  FOOTBALL_API_KEY: string
  WORLD_CUP_LEAGUE_ID?: string
  WORLD_CUP_SEASON?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: '*', // Restrict to frontend URL in prod
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
}))

// --- Helpers ---

function makeProvider(env: Bindings): FootballProvider {
  const leagueId = env.WORLD_CUP_LEAGUE_ID ? parseInt(env.WORLD_CUP_LEAGUE_ID, 10) : 1
  const season = env.WORLD_CUP_SEASON ? parseInt(env.WORLD_CUP_SEASON, 10) : 2026
  return new ApiSportsFootballProvider(env.FOOTBALL_API_KEY, leagueId, season)
}

// Maps an API-Sports `league.round` string to one of our phase ids.
// Order matters: "Semi-finals" and "3rd Place Final" both contain "final".
function mapRoundToPhaseId(round: string): PhaseType {
  const r = round.toLowerCase()
  if (r.includes('group')) return 'phase_groups'
  if (r.includes('round of 32') || r.includes('1/16')) return 'phase_16'
  if (r.includes('round of 16') || r.includes('1/8')) return 'phase_8'
  if (r.includes('quarter')) return 'phase_4'
  if (r.includes('semi')) return 'phase_semi'
  if (r.includes('3rd place') || r.includes('third place')) return 'phase_3rd'
  if (r.includes('final')) return 'phase_final'
  return 'phase_groups'
}

// Pulls teams + matches from the football provider into D1, then recomputes scores.
async function syncTournamentData(env: Bindings) {
  const provider = makeProvider(env)

  const teams = await provider.getTeams()
  for (const t of teams) {
    await env.DB.prepare(
      `INSERT INTO teams (id, name, group_name, flag_url) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, group_name = excluded.group_name, flag_url = excluded.flag_url`
    ).bind(t.id, t.name, t.group, t.flagUrl).run()
  }

  const matches = await provider.getMatches()
  for (const m of matches) {
    const phaseId = mapRoundToPhaseId(m.phaseName)
    await env.DB.prepare(
      `INSERT INTO matches (id, api_match_id, phase_id, home_team_id, away_team_id, match_date, status, home_score, away_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         home_score = excluded.home_score,
         away_score = excluded.away_score,
         match_date = excluded.match_date`
    ).bind(m.id, m.id, phaseId, m.homeTeamId, m.awayTeamId, m.date, m.status, m.homeScore, m.awayScore).run()
  }

  const ranked = await recalculateScores(env)
  return { teams: teams.length, matches: matches.length, rankedUsers: ranked }
}

// Recomputes prediction points for every finished match and rebuilds the rankings table.
async function recalculateScores(env: Bindings): Promise<number> {
  const { results: finished } = await env.DB.prepare(
    `SELECT id, phase_id, home_score, away_score FROM matches
     WHERE status = 'FINISHED' AND home_score IS NOT NULL AND away_score IS NOT NULL`
  ).all<{ id: string; phase_id: string; home_score: number; away_score: number }>()

  const stats = new Map<string, { points: number; exact: number; winners: number }>()

  for (const match of finished) {
    const { results: preds } = await env.DB.prepare(
      `SELECT id, user_id, predicted_home, predicted_away FROM predictions WHERE match_id = ?`
    ).bind(match.id).all<{ id: string; user_id: string; predicted_home: number; predicted_away: number }>()

    for (const p of preds) {
      const b = calculatePoints(
        { homeScore: p.predicted_home, awayScore: p.predicted_away },
        { homeScore: match.home_score, awayScore: match.away_score },
        match.phase_id as PhaseType
      )
      await env.DB.prepare(`UPDATE predictions SET points = ?, locked = 1 WHERE id = ?`)
        .bind(b.total, p.id).run()

      const s = stats.get(p.user_id) ?? { points: 0, exact: 0, winners: 0 }
      s.points += b.total
      if (b.exactScore > 0) s.exact += 1
      if (b.correctWinner > 0) s.winners += 1
      stats.set(p.user_id, s)
    }
  }

  for (const [userId, s] of stats) {
    await env.DB.prepare(
      `INSERT INTO rankings (id, user_id, total_points, exact_scores, correct_winners, position)
       VALUES (?, ?, ?, ?, ?, 0)
       ON CONFLICT(user_id) DO UPDATE SET
         total_points = excluded.total_points,
         exact_scores = excluded.exact_scores,
         correct_winners = excluded.correct_winners`
    ).bind(`rank_${userId}`, userId, s.points, s.exact, s.winners).run()
  }

  // Recompute leaderboard positions.
  const { results: order } = await env.DB.prepare(
    `SELECT user_id FROM rankings ORDER BY total_points DESC, exact_scores DESC`
  ).all<{ user_id: string }>()
  let pos = 1
  for (const row of order) {
    await env.DB.prepare(`UPDATE rankings SET position = ? WHERE user_id = ?`).bind(pos, row.user_id).run()
    pos++
  }

  return stats.size
}

// --- Routes ---

app.get('/', (c) => {
  return c.json({ message: 'Polla Mundialista API is running!' })
})

// Verifies the football API connection WITHOUT touching the database.
// Use this first to confirm the API key works.
app.get('/api/football/status', async (c) => {
  try {
    const provider = makeProvider(c.env)
    const [teams, matches, stage] = await Promise.all([
      provider.getTeams(),
      provider.getMatches(),
      provider.getTournamentStage()
    ])
    return c.json({
      success: true,
      currentStage: stage,
      teamCount: teams.length,
      matchCount: matches.length,
      sampleMatch: matches[0] ?? null
    })
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 502)
  }
})

// Triggers a full sync into D1 + score recalculation. Protect with admin auth in prod.
app.post('/api/admin/sync', async (c) => {
  try {
    const result = await syncTournamentData(c.env)
    return c.json({ success: true, ...result })
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500)
  }
})

// --- Test Database ---
app.get('/test-db', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM phases').all()
    return c.json({ success: true, data: results })
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500)
  }
})

// --- Worker export ---
export default {
  fetch: app.fetch,
  // Cron Trigger: runs every 30 minutes (see wrangler.toml).
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(handleCronJob(env))
  }
}

async function handleCronJob(env: Bindings) {
  console.log('Cron Job started at', new Date().toISOString())
  try {
    const result = await syncTournamentData(env)
    console.log('Cron sync OK:', JSON.stringify(result))
  } catch (error) {
    console.error('Cron sync failed:', (error as Error).message)
  }
}
