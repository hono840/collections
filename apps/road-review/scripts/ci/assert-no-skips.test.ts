// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { findNonPassingTests } from './assert-no-skips.mjs'

// Shape of Vitest's `--reporter=json` output (Jest-compatible).
function report(statuses: string[], overrides: Record<string, number> = {}) {
  const count = (status: string) => statuses.filter((value) => value === status).length
  return {
    numTotalTests: statuses.length,
    numPassedTests: count('passed'),
    numFailedTests: count('failed'),
    numPendingTests: count('pending') + count('skipped'),
    numTodoTests: count('todo'),
    ...overrides,
    testResults: [
      {
        name: '/app/src/example.test.ts',
        assertionResults: statuses.map((status, index) => ({ fullName: `case ${index}`, status })),
      },
    ],
  }
}

describe('findNonPassingTests', () => {
  it('passes when every test passed', () => {
    expect(findNonPassingTests(report(['passed', 'passed']))).toEqual([])
  })

  it.each(['skipped', 'pending', 'todo', 'failed'])('fails on a single %s test', (status) => {
    const problems = findNonPassingTests(report(['passed', status]))
    expect(problems).toContainEqual(expect.stringContaining(`case 1 (${status})`))
  })

  it('fails when the summary counts report skips even if no assertion lists them', () => {
    const problems = findNonPassingTests(report(['passed'], { numPendingTests: 1 }))
    expect(problems).toContainEqual(expect.stringMatching(/numPendingTests=1/))
  })

  it('fails when no tests ran', () => {
    expect(findNonPassingTests(report([]))).toContainEqual(expect.stringMatching(/no tests ran/))
  })
})
