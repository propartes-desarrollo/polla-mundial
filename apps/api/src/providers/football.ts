export interface ApiTeam {
  id: string
  name: string
  group: string
  flagUrl: string
}

export interface ApiMatch {
  id: string
  homeTeamId: string
  awayTeamId: string
  date: string
  status: 'SCHEDULED' | 'IN_PLAY' | 'FINISHED'
  homeScore: number | null
  awayScore: number | null
  phaseName: string
  // Ganador explícito del partido (clave en finales definidas por penales,
  // donde el marcador puede quedar empatado).
  winner?: 'HOME' | 'AWAY' | null
  // Cómo terminó el partido y los marcadores de desempate, para mostrar
  // "Avanza X por penales" y el resultado de penales / gol en tiempo extra.
  // homeScore/awayScore siguen siendo el marcador de los 90'.
  duration?: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null
  penaltyHome?: number | null
  penaltyAway?: number | null
  fullHome?: number | null // marcador final en cancha (incluye tiempo extra)
  fullAway?: number | null
}

export interface FootballProvider {
  getTeams(): Promise<ApiTeam[]>
  getMatches(): Promise<ApiMatch[]>
  getTournamentStage(): Promise<string>
}

// Mock Implementation for initial testing and decoupled logic
export class MockFootballProvider implements FootballProvider {
  async getTeams(): Promise<ApiTeam[]> {
    return [
      { id: 'team_arg', name: 'Argentina', group: 'Group A', flagUrl: 'https://flags.example.com/arg.png' },
      { id: 'team_bra', name: 'Brasil', group: 'Group B', flagUrl: 'https://flags.example.com/bra.png' },
    ]
  }

  async getMatches(): Promise<ApiMatch[]> {
    return [
      {
        id: 'match_001',
        homeTeamId: 'team_arg',
        awayTeamId: 'team_bra',
        date: new Date().toISOString(),
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
        phaseName: 'Fase de Grupos'
      }
    ]
  }

  async getTournamentStage(): Promise<string> {
    return 'Fase de Grupos'
  }
}
