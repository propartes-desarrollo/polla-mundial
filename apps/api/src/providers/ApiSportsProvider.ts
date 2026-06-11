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
    
    const data = await response.json()
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
    
    return data.map((item: any) => {
      let status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED' = 'SCHEDULED'
      if (['1H', '2H', 'HT', 'ET', 'P'].includes(item.fixture.status.short)) status = 'IN_PLAY'
      if (['FT', 'AET', 'PEN'].includes(item.fixture.status.short)) status = 'FINISHED'

      return {
        id: `match_${item.fixture.id}`,
        homeTeamId: `team_${item.teams.home.id}`,
        awayTeamId: `team_${item.teams.away.id}`,
        date: item.fixture.date,
        status,
        homeScore: item.goals.home,
        awayScore: item.goals.away,
        phaseName: item.league.round
      }
    })
  }

  async getTournamentStage(): Promise<string> {
    const data = await this.fetchFromApi(`/fixtures/rounds?league=${this.worldCupLeagueId}&season=${this.season}&current=true`)
    return data[0] || 'Unknown'
  }
}
