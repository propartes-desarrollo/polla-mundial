import { ApiMatch, ApiTeam, FootballProvider } from './football'

export class ApiSportsFootballProvider implements FootballProvider {
  private apiKey: string
  private baseUrl = 'https://v3.football.api-sports.io'
  private worldCupLeagueId: number // 1 = FIFA World Cup (confirmed via /leagues)
  private season: number           // 2026

  constructor(apiKey: string, leagueId = 1, season = 2026) {
    this.apiKey = apiKey
    this.worldCupLeagueId = leagueId
    this.season = season
  }

  private async fetchFromApi(endpoint: string) {
    // api-sports.io direct API uses the `x-apisports-key` header.
    // (The `x-rapidapi-key`/`x-rapidapi-host` pair is only for the RapidAPI gateway.)
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'x-apisports-key': this.apiKey
      }
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    const data = await response.json() as { response: any; errors?: unknown }

    // api-sports returns HTTP 200 even on errors (plan limits, bad key, etc.),
    // putting the reason in `errors`. Surface it instead of silently returning [].
    const errors = data.errors
    const hasErrors = Array.isArray(errors)
      ? errors.length > 0
      : errors && typeof errors === 'object' && Object.keys(errors).length > 0
    if (hasErrors) {
      throw new Error(`API-Sports: ${JSON.stringify(errors)}`)
    }

    return data.response
  }

  async getTeams(): Promise<ApiTeam[]> {
    const data = await this.fetchFromApi(`/teams?league=${this.worldCupLeagueId}&season=${this.season}`)
    
    return data.map((item: any) => ({
      id: `team_${item.team.id}`,
      name: item.team.name,
      group: 'Unknown', // La API provee esto en endpoints separados usualmente
      flagUrl: item.team.logo
    }))
  }

  async getMatches(): Promise<ApiMatch[]> {
    const data = await this.fetchFromApi(`/fixtures?league=${this.worldCupLeagueId}&season=${this.season}`)

    return data
      // Saltar cruces de eliminatoria aún sin definir: la API devuelve los
      // equipos en null hasta conocerse la pareja. Sin esta guarda se generan
      // ids huérfanos ("team_null") que el INNER JOIN de /api/matches descarta.
      .filter((item: any) => item?.teams?.home?.id != null && item?.teams?.away?.id != null)
      .map((item: any) => {
      let status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' = 'SCHEDULED'
      if (['1H', '2H', 'HT', 'ET', 'P'].includes(item.fixture.status.short)) status = 'IN_PLAY'
      if (['FT', 'AET', 'PEN'].includes(item.fixture.status.short)) status = 'FINISHED'

      let winner: 'HOME' | 'AWAY' | null = null
      if (item.teams.home.winner === true) winner = 'HOME'
      if (item.teams.away.winner === true) winner = 'AWAY'

      return {
        id: `match_${item.fixture.id}`,
        homeTeamId: `team_${item.teams.home.id}`,
        awayTeamId: `team_${item.teams.away.id}`,
        date: item.fixture.date,
        status,
        homeScore: item.goals.home,
        awayScore: item.goals.away,
        phaseName: item.league.round,
        winner
      }
    })
  }

  async getTournamentStage(): Promise<string> {
    const data = await this.fetchFromApi(`/fixtures/rounds?league=${this.worldCupLeagueId}&season=${this.season}&current=true`)
    return data[0] || 'Unknown'
  }
}
