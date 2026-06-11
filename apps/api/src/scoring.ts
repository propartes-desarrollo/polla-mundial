export type PhaseType = 'phase_groups' | 'phase_16' | 'phase_8' | 'phase_4' | 'phase_semi' | 'phase_3rd' | 'phase_final'

export interface MatchResult {
  homeScore: number
  awayScore: number
}

export interface PointsBreakdown {
  correctWinner: number
  goalDifference: number
  exactScore: number
  total: number
}

export function calculatePoints(
  prediction: MatchResult,
  actual: MatchResult,
  phase: PhaseType
): PointsBreakdown {
  const breakdown: PointsBreakdown = {
    correctWinner: 0,
    goalDifference: 0,
    exactScore: 0,
    total: 0
  }

  // Determine winners
  const predHomeWins = prediction.homeScore > prediction.awayScore
  const predAwayWins = prediction.awayScore > prediction.homeScore
  const predDraw = prediction.homeScore === prediction.awayScore

  const actualHomeWins = actual.homeScore > actual.awayScore
  const actualAwayWins = actual.awayScore > actual.homeScore
  const actualDraw = actual.homeScore === actual.awayScore

  const correctWinner =
    (predHomeWins && actualHomeWins) ||
    (predAwayWins && actualAwayWins) ||
    (predDraw && actualDraw)

  const predDiff = prediction.homeScore - prediction.awayScore
  const actualDiff = actual.homeScore - actual.awayScore
  const correctDiff = predDiff === actualDiff

  const exactScore =
    prediction.homeScore === actual.homeScore &&
    prediction.awayScore === actual.awayScore

  // Apply points based on phase
  switch (phase) {
    case 'phase_groups':
      if (correctWinner) breakdown.correctWinner = 3
      if (correctDiff && !predDraw) breakdown.goalDifference = 2 // In draws, correct winner already covers it, but example says "3+2+5". Wait, if draw 1-1 and actual is 1-1, correct diff is 0=0.
      if (exactScore) breakdown.exactScore = 5
      break
    case 'phase_16':
    case 'phase_8':
      if (correctWinner) breakdown.correctWinner = 5
      if (exactScore) breakdown.exactScore = 8
      break
    case 'phase_4':
      if (correctWinner) breakdown.correctWinner = 7
      if (exactScore) breakdown.exactScore = 10
      break
    case 'phase_semi':
    case 'phase_3rd': // Assuming 3rd place has same points as semi? Or maybe finals? Let's use semi points for now.
      if (correctWinner) breakdown.correctWinner = 10
      if (exactScore) breakdown.exactScore = 15
      break
    case 'phase_final':
      if (correctWinner) breakdown.correctWinner = 15
      if (exactScore) breakdown.exactScore = 25
      break
  }

  breakdown.total = breakdown.correctWinner + breakdown.goalDifference + breakdown.exactScore

  return breakdown
}

// Special Predictions Points
export const SPECIAL_POINTS = {
  CHAMPION: 30,
  RUNNER_UP: 15,
  TOP_SCORER: 20
}
