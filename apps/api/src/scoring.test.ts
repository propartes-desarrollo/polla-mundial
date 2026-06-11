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

  // Test 1: Group Phase - Correct exact score
  const res1 = calculatePoints({ homeScore: 2, awayScore: 1 }, { homeScore: 2, awayScore: 1 }, 'phase_groups')
  assertEqual(res1.total, 10, 'Group Phase Exact Score (3 Winner + 2 Diff + 5 Exact)')

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

  console.log('All Scoring Engine tests passed!')
}

runTests()
