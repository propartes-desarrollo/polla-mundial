import { calculatePoints, PhaseType } from './scoring'

// Using a simple testing approach without external dependencies for now.
// A real project would use Vitest or Jest.

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Test Failed: ${message} | Expected: ${expected}, Got: ${actual}`)
  }
}

function runTests() {
  console.log('Running Scoring Engine Tests...')

  // Test 1: Group Phase - Correct exact score (includes +1 per team goals)
  const res1 = calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 }, 'phase_groups')
  assertEqual(res1.total, 12, 'Group Phase Exact Score (3 Winner + 2 Diff + 5 Exact + 2 Team Goals)')

  // Test 2: Group Phase - Correct winner and goal difference, but wrong exact score
  const res2 = calculatePoints({ homeScore: 3, awayScore: 1 }, { homeScore: 2, awayScore: 0 }, 'phase_groups')
  assertEqual(res2.total, 5, 'Group Phase Correct Winner + Diff (3 + 2)')

  // Test 3: Group Phase - Correct winner only
  const res3 = calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 3, awayScore: 1 }, 'phase_groups')
  assertEqual(res3.total, 3, 'Group Phase Correct Winner Only (3)')

  // Test 4: Final - Correct exact score
  const res4 = calculatePoints({ homeScore: 1, awayScore: 0 }, { homeScore: 1, awayScore: 0 }, 'phase_final')
  assertEqual(res4.total, 40, 'Final Exact Score (15 Winner + 25 Exact)')

  // Test 5: Final - Incorrect prediction
  const res5 = calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 0, awayScore: 1 }, 'phase_final')
  assertEqual(res5.total, 0, 'Final Incorrect')

  // Test 6: Group Phase - Wrong winner but one team's goals right (real 1-1, pred 2-1)
  const res6 = calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 1 }, 'phase_groups')
  assertEqual(res6.total, 1, 'Group Phase Partial: away goals right, wrong winner (+1)')
  assertEqual(res6.teamGoals, 1, 'Group Phase Partial: teamGoals breakdown is 1')

  // Test 7: Group Phase - Wrong winner, home goals right (real 1-1, pred 1-2)
  const res7 = calculatePoints({ homeScore: 1, awayScore: 2 }, { homeScore: 1, awayScore: 1 }, 'phase_groups')
  assertEqual(res7.total, 1, 'Group Phase Partial: home goals right, wrong winner (+1)')

  // Test 8: Group Phase - Exact draw (3 Winner + 5 Exact + 2 Team Goals, draws earn no diff)
  const res8 = calculatePoints({ homeScore: 1, awayScore: 1 }, { homeScore: 1, awayScore: 1 }, 'phase_groups')
  assertEqual(res8.total, 10, 'Group Phase Exact Draw (3 + 5 + 2)')

  // Test 9: Group Phase - Draw predicted, draw happened, different score (real 1-1, pred 2-2)
  const res9 = calculatePoints({ homeScore: 2, awayScore: 2 }, { homeScore: 1, awayScore: 1 }, 'phase_groups')
  assertEqual(res9.total, 3, 'Group Phase Draw, no goals matched (3 + 0)')

  // Test 10: Knockouts - team goals do NOT score (real 1-1, pred 2-1 in round of 16)
  const res10 = calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 1, awayScore: 1 }, 'phase_16')
  assertEqual(res10.total, 0, 'Knockout: no partial team-goal points')
  assertEqual(res10.teamGoals, 0, 'Knockout: teamGoals breakdown is 0')

  console.log('All Scoring Engine tests passed!')
}

runTests()
