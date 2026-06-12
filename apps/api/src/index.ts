import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { ApiSportsFootballProvider } from './providers/ApiSportsProvider'
import { FootballDataProvider } from './providers/FootballDataProvider'
import { FootballProvider } from './providers/football'
import { calculatePoints, PhaseType } from './scoring'
import { calculatePrizeDistribution, DEFAULT_INSCRIPTION_FEE } from './prizes'
import { translateTeamName } from './teamNames'
import { createToken, verifyToken, hashPassword, verifyPassword, JwtUser } from './auth'

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  FOOTBALL_API_KEY: string
  FOOTBALL_DATA_API_KEY?: string
  FOOTBALL_PROVIDER?: string // 'apisports' (default) | 'footballdata'
  FRONTEND_URL?: string
  WORLD_CUP_LEAGUE_ID?: string
  WORLD_CUP_SEASON?: string
}

type Variables = {
  user: JwtUser
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('*', cors({
  origin: '*', // Restrict to frontend URL in prod
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
}))

// --- Auth middleware ---

const requireAuth = async (c: any, next: any) => {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return c.json({ error: 'No autorizado' }, 401)
  const user = await verifyToken(token, c.env.JWT_SECRET)
  if (!user) return c.json({ error: 'Token inválido o expirado' }, 401)
  c.set('user', user)
  await next()
}

const requireAdmin = async (c: any, next: any) => {
  const user = c.get('user') as JwtUser | undefined
  if (!user || user.role !== 'ADMIN') return c.json({ error: 'Solo administradores' }, 403)
  await next()
}

app.use('/api/me', requireAuth)
app.use('/api/matches', requireAuth)
app.use('/api/predictions', requireAuth)
app.use('/api/teams', requireAuth)
app.use('/api/special-predictions', requireAuth)
app.use('/api/admin/*', requireAuth, requireAdmin)

// --- Football provider helpers ---

function makeProvider(env: Bindings): FootballProvider {
  const season = env.WORLD_CUP_SEASON ? parseInt(env.WORLD_CUP_SEASON, 10) : 2026

  if (env.FOOTBALL_PROVIDER === 'footballdata') {
    if (!env.FOOTBALL_DATA_API_KEY) {
      throw new Error('FOOTBALL_PROVIDER=footballdata pero falta el secreto FOOTBALL_DATA_API_KEY')
    }
    return new FootballDataProvider(env.FOOTBALL_DATA_API_KEY, season)
  }

  const leagueId = env.WORLD_CUP_LEAGUE_ID ? parseInt(env.WORLD_CUP_LEAGUE_ID, 10) : 1
  return new ApiSportsFootballProvider(env.FOOTBALL_API_KEY, leagueId, season)
}

// Maps a provider round/stage string to one of our phase ids. Handles both
// api-sports rounds ("Round of 16", "3rd Place Final") and football-data
// stages ("LAST_16", "THIRD_PLACE", "FINAL").
// Order matters: "Semi-finals" and "3rd Place Final" both contain "final".
function mapRoundToPhaseId(round: string): PhaseType {
  const r = round.toLowerCase().replace(/_/g, ' ')
  if (r.includes('group')) return 'phase_groups'
  if (r.includes('round of 32') || r.includes('last 32') || r.includes('1/16')) return 'phase_16'
  if (r.includes('round of 16') || r.includes('last 16') || r.includes('1/8')) return 'phase_8'
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
    ).bind(t.id, translateTeamName(t.name), t.group, t.flagUrl).run()
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

  const rankedUsers = await recalculateScores(env)
  return { teams: teams.length, matches: matches.length, rankedUsers }
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

// --- Recaudo (cuota configurable + control de pagos) ---

async function getInscriptionFee(env: Bindings): Promise<number> {
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'inscription_fee'")
      .first<{ value: string }>()
    const n = row ? parseInt(row.value, 10) : NaN
    return Number.isFinite(n) ? n : DEFAULT_INSCRIPTION_FEE
  } catch {
    return DEFAULT_INSCRIPTION_FEE // la tabla settings aún no existe
  }
}

interface RecaudoInfo {
  participants: number   // usuarios registrados (rol USER)
  paidCount: number      // de esos, cuántos pagaron
  pendingCount: number
  fee: number
  totalCollected: number // paidCount * fee
}

async function getRecaudo(env: Bindings): Promise<RecaudoInfo> {
  const fee = await getInscriptionFee(env)
  const totalRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'USER'")
    .first<{ n: number }>()
  const participants = totalRow?.n ?? 0

  let paidCount = participants // fallback si la columna `paid` aún no existe
  try {
    const paidRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'USER' AND paid = 1")
      .first<{ n: number }>()
    paidCount = paidRow?.n ?? 0
  } catch {
    // columna `paid` no existe todavía → comportamiento previo (todos cuentan)
  }

  return {
    participants,
    paidCount,
    pendingCount: Math.max(0, participants - paidCount),
    fee,
    totalCollected: paidCount * fee
  }
}

// ============================ Routes ============================

app.get('/', (c) => c.json({ message: 'Polla Mundialista API is running!' }))

// --- Auth ---

app.post('/api/auth/login', async (c) => {
  const { phone, password } = await c.req.json<{ phone: string; password: string }>()
  if (!phone || !password) return c.json({ error: 'Teléfono y contraseña requeridos' }, 400)

  const user = await c.env.DB.prepare('SELECT id, name, role, password_hash FROM users WHERE phone = ?')
    .bind(phone).first<{ id: string; name: string; role: string; password_hash: string }>()
  if (!user) return c.json({ error: 'Credenciales inválidas' }, 401)

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.json({ error: 'Credenciales inválidas' }, 401)

  const token = await createToken({ id: user.id, role: user.role, name: user.name }, c.env.JWT_SECRET)
  return c.json({ token, user: { id: user.id, name: user.name, role: user.role } })
})

app.post('/api/auth/register', async (c) => {
  const { token: inviteToken, name, phone, password } =
    await c.req.json<{ token: string; name: string; phone: string; password: string }>()
  if (!inviteToken || !name || !phone || !password) {
    return c.json({ error: 'Todos los campos son requeridos' }, 400)
  }

  const inv = await c.env.DB.prepare('SELECT id, expires_at FROM invitations WHERE token = ? AND used = 0')
    .bind(inviteToken).first<{ id: string; expires_at: string | null }>()
  if (!inv) return c.json({ error: 'Invitación inválida o ya utilizada' }, 400)
  if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
    return c.json({ error: 'La invitación expiró' }, 400)
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE phone = ?').bind(phone).first()
  if (existing) return c.json({ error: 'El teléfono ya está registrado' }, 400)

  const id = crypto.randomUUID()
  const hash = await hashPassword(password)
  await c.env.DB.prepare('INSERT INTO users (id, name, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .bind(id, name, phone, hash, 'USER').run()
  await c.env.DB.prepare('UPDATE invitations SET used = 1 WHERE id = ?').bind(inv.id).run()
  await c.env.DB.prepare(
    'INSERT OR IGNORE INTO rankings (id, user_id, total_points, exact_scores, correct_winners, position) VALUES (?, ?, 0, 0, 0, 0)'
  ).bind(`rank_${id}`, id).run()

  const token = await createToken({ id, role: 'USER', name }, c.env.JWT_SECRET)
  return c.json({ token, user: { id, name, role: 'USER' } })
})

// --- Public ranking ---

app.get('/api/ranking', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT r.position, u.name,
            r.total_points AS points,
            r.exact_scores AS exactScores,
            r.correct_winners AS correctWinners
     FROM rankings r
     JOIN users u ON u.id = r.user_id
     WHERE u.role = 'USER'
     ORDER BY r.total_points DESC, r.exact_scores DESC`
  ).all()
  // Re-number positions for display (handles ties / unsynced positions).
  const ranked = results.map((row: any, idx: number) => ({ ...row, position: idx + 1 }))
  return c.json(ranked)
})

// --- Authenticated user ---

app.get('/api/me', async (c) => {
  const user = c.get('user')
  const rank = await c.env.DB.prepare('SELECT total_points, position FROM rankings WHERE user_id = ?')
    .bind(user.id).first<{ total_points: number; position: number }>()
  return c.json({
    id: user.id,
    name: user.name,
    role: user.role,
    points: rank?.total_points ?? 0,
    position: rank?.position ?? 0
  })
})

app.get('/api/matches', async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT m.id, m.match_date AS matchDate, m.status,
            m.home_score AS homeScore, m.away_score AS awayScore,
            ph.name AS phaseName,
            ht.name AS homeName, ht.flag_url AS homeFlag,
            at.name AS awayName, at.flag_url AS awayFlag,
            p.predicted_home AS predictedHome,
            p.predicted_away AS predictedAway,
            p.points AS predictionPoints
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     JOIN phases ph ON ph.id = m.phase_id
     LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = ?
     ORDER BY m.match_date ASC`
  ).bind(user.id).all()
  return c.json(results)
})

app.post('/api/predictions', async (c) => {
  const user = c.get('user')
  const { matchId, home, away } = await c.req.json<{ matchId: string; home: number; away: number }>()

  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return c.json({ error: 'Marcador inválido' }, 400)
  }

  const match = await c.env.DB.prepare('SELECT status FROM matches WHERE id = ?')
    .bind(matchId).first<{ status: string }>()
  if (!match) return c.json({ error: 'Partido no encontrado' }, 404)
  if (match.status !== 'SCHEDULED') return c.json({ error: 'El partido ya está bloqueado' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO predictions (id, user_id, match_id, predicted_home, predicted_away)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, match_id) DO UPDATE SET
       predicted_home = excluded.predicted_home,
       predicted_away = excluded.predicted_away`
  ).bind(id, user.id, matchId, home, away).run()

  return c.json({ success: true })
})

// --- Teams (para selects de pronósticos especiales) ---

app.get('/api/teams', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, flag_url AS flagUrl FROM teams ORDER BY name'
  ).all()
  return c.json(results)
})

// --- Pronósticos especiales (campeón, subcampeón, goleador) ---

app.get('/api/special-predictions', async (c) => {
  const user = c.get('user')
  const row = await c.env.DB.prepare(
    `SELECT sp.champion_team_id AS championTeamId,
            sp.runner_up_team_id AS runnerUpTeamId,
            sp.top_scorer_name AS topScorerName,
            sp.locked,
            tc.name AS championName, tc.flag_url AS championFlag,
            tr.name AS runnerUpName, tr.flag_url AS runnerUpFlag
     FROM special_predictions sp
     LEFT JOIN teams tc ON tc.id = sp.champion_team_id
     LEFT JOIN teams tr ON tr.id = sp.runner_up_team_id
     WHERE sp.user_id = ?`
  ).bind(user.id).first()
  return c.json(row ?? null)
})

app.post('/api/special-predictions', async (c) => {
  const user = c.get('user')
  const { championTeamId, runnerUpTeamId, topScorerName } =
    await c.req.json<{ championTeamId: string; runnerUpTeamId: string; topScorerName: string }>()

  const existing = await c.env.DB.prepare(
    'SELECT id, locked FROM special_predictions WHERE user_id = ?'
  ).bind(user.id).first<{ id: string; locked: number }>()
  if (existing?.locked) return c.json({ error: 'Tus pronósticos especiales ya están bloqueados' }, 400)

  const id = existing?.id ?? crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO special_predictions (id, user_id, champion_team_id, runner_up_team_id, top_scorer_name, locked)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(user_id) DO UPDATE SET
       champion_team_id = excluded.champion_team_id,
       runner_up_team_id = excluded.runner_up_team_id,
       top_scorer_name = excluded.top_scorer_name`
  ).bind(id, user.id, championTeamId || null, runnerUpTeamId || null, topScorerName || null).run()

  return c.json({ success: true })
})

// --- Premios (público: desglose en dinero según participantes) ---

app.get('/api/prizes', async (c) => {
  const recaudo = await getRecaudo(c.env)
  const dist = calculatePrizeDistribution(recaudo.totalCollected)
  return c.json({
    participants: recaudo.participants,
    paidCount: recaudo.paidCount,
    totalCollected: dist.totalCollected,
    prizes: [
      { label: 'Campeón de la polla (1er puesto)', amount: Math.round(dist.prizes.firstPlace) },
      { label: 'Subcampeón (2do puesto)', amount: Math.round(dist.prizes.secondPlace) },
      { label: 'Tercer puesto', amount: Math.round(dist.prizes.thirdPlace) },
      { label: 'Más marcadores exactos', amount: Math.round(dist.prizes.mostExactScores) },
      { label: 'Más ganadores acertados', amount: Math.round(dist.prizes.mostCorrectWinners) },
      { label: 'Acertar el campeón del Mundial', amount: Math.round(dist.prizes.correctChampion) },
      { label: 'Acertar el goleador del Mundial', amount: Math.round(dist.prizes.correctTopScorer) }
    ]
  })
})

// --- Admin ---

app.post('/api/admin/lock-specials', async (c) => {
  await c.env.DB.prepare('UPDATE special_predictions SET locked = 1').run()
  return c.json({ success: true })
})

app.get('/api/admin/stats', async (c) => {
  const recaudo = await getRecaudo(c.env)
  return c.json(recaudo)
})

// Lista de participantes con su estado de pago (para el control de recaudo).
app.get('/api/admin/participants', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.phone,
            COALESCE(u.paid, 0) AS paid,
            COALESCE(r.total_points, 0) AS points
     FROM users u
     LEFT JOIN rankings r ON r.user_id = u.id
     WHERE u.role = 'USER'
     ORDER BY u.name`
  ).all()
  return c.json(results)
})

// Marca/desmarca el pago de un participante.
app.put('/api/admin/participants/:id/payment', async (c) => {
  const id = c.req.param('id')
  const { paid } = await c.req.json<{ paid: boolean }>()
  await c.env.DB.prepare('UPDATE users SET paid = ? WHERE id = ?')
    .bind(paid ? 1 : 0, id).run()
  return c.json({ success: true })
})

// Actualiza la cuota de inscripción.
app.put('/api/admin/fee', async (c) => {
  const { fee } = await c.req.json<{ fee: number }>()
  if (!Number.isFinite(fee) || fee < 0) return c.json({ error: 'Cuota inválida' }, 400)
  await c.env.DB.prepare(
    `INSERT INTO settings (key, value) VALUES ('inscription_fee', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).bind(String(Math.round(fee))).run()
  return c.json({ success: true })
})

app.get('/api/admin/phases', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT id, name, status FROM phases ORDER BY rowid').all()
  return c.json(results)
})

app.put('/api/admin/phases/:id', async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json<{ status: string }>()
  if (!['PENDING', 'OPEN', 'CLOSED'].includes(status)) {
    return c.json({ error: 'Estado inválido' }, 400)
  }
  await c.env.DB.prepare('UPDATE phases SET status = ? WHERE id = ?').bind(status, id).run()
  return c.json({ success: true })
})

app.post('/api/admin/invitations', async (c) => {
  const id = crypto.randomUUID()
  const token = crypto.randomUUID().replace(/-/g, '')
  await c.env.DB.prepare('INSERT INTO invitations (id, token, used) VALUES (?, ?, 0)')
    .bind(id, token).run()
  const base = c.env.FRONTEND_URL || ''
  return c.json({ token, url: `${base}/login?invite=${token}` })
})

app.post('/api/admin/sync', async (c) => {
  try {
    const result = await syncTournamentData(c.env)
    return c.json({ success: true, ...result })
  } catch (error) {
    return c.json({ success: false, error: (error as Error).message }, 500)
  }
})

// Verifies the football API connection WITHOUT touching the database.
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
