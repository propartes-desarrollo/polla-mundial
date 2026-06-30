import { ApiMatch, ApiTeam, FootballProvider } from './football'

// Provider for football-data.org (v4 API).
// Auth: X-Auth-Token header. World Cup competition code: "WC".
// Free tier includes the World Cup (rate limit ~10 req/min).
export class FootballDataProvider implements FootballProvider {
  private apiKey: string
  private baseUrl = 'https://api.football-data.org/v4'
  private competition = 'WC'
  private season: number

  constructor(apiKey: string, season = 2026) {
    this.apiKey = apiKey
    this.season = season
  }

  private async fetchFromApi(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { 'X-Auth-Token': this.apiKey }
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`football-data.org ${response.status}: ${body || response.statusText}`)
    }

    return response.json() as Promise<any>
  }

  async getTeams(): Promise<ApiTeam[]> {
    const data = await this.fetchFromApi(`/competitions/${this.competition}/teams?season=${this.season}`)

    // IDs are prefixed with `team_fd_` so they never collide with api-sports ids
    // (both providers use plain numeric ids in overlapping ranges).
    return (data.teams ?? []).map((t: any) => ({
      id: `team_fd_${t.id}`,
      name: t.name,
      group: 'Unknown', // group comes per-match (match.group), not in the teams endpoint
      flagUrl: t.crest ?? ''
    }))
  }

  async getMatches(): Promise<ApiMatch[]> {
    const data = await this.fetchFromApi(`/competitions/${this.competition}/matches?season=${this.season}`)

    return (data.matches ?? [])
      // Saltar cruces de eliminatoria aún SIN definir: football-data.org devuelve
      // homeTeam/awayTeam en null (o con id null) hasta que se conoce la pareja.
      // Sin esta guarda, `team_fd_${null}` produce el id huérfano "team_fd_null"
      // que el INNER JOIN de /api/matches descarta en silencio (y un objeto de
      // equipo totalmente null haría que `m.homeTeam.id` lance y aborte TODO el
      // sync). Con la guarda, cada fase aparece apenas se definen sus equipos.
      .filter((m: any) => m?.homeTeam?.id != null && m?.awayTeam?.id != null)
      .map((m: any) => {
      let status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' = 'SCHEDULED'
      if (['IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT'].includes(m.status)) status = 'IN_PLAY'
      if (['FINISHED', 'AWARDED'].includes(m.status)) status = 'FINISHED'

      let winner: 'HOME' | 'AWAY' | null = null
      if (m.score?.winner === 'HOME_TEAM') winner = 'HOME'
      if (m.score?.winner === 'AWAY_TEAM') winner = 'AWAY'

      return {
        id: `match_fd_${m.id}`,
        homeTeamId: `team_fd_${m.homeTeam.id}`,
        awayTeamId: `team_fd_${m.awayTeam.id}`,
        date: m.utcDate,
        status,
        // Marcador de los 90' REGLAMENTARIOS. En eliminatoria que se va a
        // alargue o penales, football-data.org expone score.regularTime con el
        // resultado de los 90 minutos (ej. 1-1 en un partido definido por
        // penales). En fase de grupos regularTime no viene → se usa fullTime.
        // (?? respeta el 0: un 0-0 de regularTime no cae a fullTime.)
        homeScore: m.score?.regularTime?.home ?? m.score?.fullTime?.home ?? null,
        awayScore: m.score?.regularTime?.away ?? m.score?.fullTime?.away ?? null,
        // stage examples: GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS,
        // SEMI_FINALS, THIRD_PLACE, FINAL
        phaseName: m.stage ?? 'GROUP_STAGE',
        winner
      }
    })
  }

  async getTournamentStage(): Promise<string> {
    const matches = await this.getMatches()
    const inPlay = matches.find((m) => m.status === 'IN_PLAY')
    if (inPlay) return inPlay.phaseName
    const next = matches.find((m) => m.status === 'SCHEDULED')
    return next?.phaseName ?? matches[matches.length - 1]?.phaseName ?? 'Unknown'
  }
}
