export interface PrizeDistribution {
  totalCollected: number
  prizePool: number
  organizerFee: number
  prizes: {
    firstPlace: number
    secondPlace: number
    thirdPlace: number
    mostExactScores: number
    mostCorrectWinners: number
    correctChampion: number
    correctTopScorer: number
  }
}

export const DEFAULT_INSCRIPTION_FEE = 50000
export const DEFAULT_RECHARGE_FEE = 30000

// totalCollected = inscripciones pagadas × cuota + recargas pagadas × cuota
// de recarga. La organización retiene el 5%; el 95% restante se reparte en premios.
export function calculatePrizeDistribution(totalCollected: number): PrizeDistribution {
  const prizePool = totalCollected * 0.95
  const organizerFee = totalCollected * 0.05

  return {
    totalCollected,
    prizePool,
    organizerFee,
    prizes: {
      firstPlace: prizePool * 0.50,
      secondPlace: prizePool * 0.20,
      thirdPlace: prizePool * 0.10,
      mostExactScores: prizePool * 0.05,
      mostCorrectWinners: prizePool * 0.05,
      correctChampion: prizePool * 0.05,
      correctTopScorer: prizePool * 0.05
    }
  }
}
