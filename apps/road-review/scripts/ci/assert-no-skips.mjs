#!/usr/bin/env node
// CI gate: a skipped / todo test is a hidden failure (ARCH v3 §10 stage 1: "one skip turns CI red").
// Reads Vitest's JSON report (`pnpm test:ci` writes reports/vitest.json) and fails on any test that
// did not pass, or when no tests ran at all.
//
// Usage: node scripts/ci/assert-no-skips.mjs [reports/vitest.json]
import { readFile } from 'node:fs/promises'
import { isMainModule } from '../csp/html-scripts.mjs'

const NOT_PASSED = new Set(['skipped', 'pending', 'todo', 'disabled', 'failed'])

/**
 * @param {{ numTotalTests?: number, numPendingTests?: number, numTodoTests?: number, numFailedTests?: number,
 *   testResults?: { name: string, assertionResults?: { fullName?: string, title?: string, status: string }[] }[] }} report
 * @returns {string[]} problems (empty = OK)
 */
export function findNonPassingTests(report) {
  const problems = []
  if (!report.numTotalTests) problems.push('no tests ran')
  for (const key of ['numPendingTests', 'numTodoTests', 'numFailedTests']) {
    if ((report[key] ?? 0) > 0) problems.push(`${key}=${report[key]}`)
  }
  for (const file of report.testResults ?? []) {
    for (const assertion of file.assertionResults ?? []) {
      if (NOT_PASSED.has(assertion.status)) {
        problems.push(`${file.name}: ${assertion.fullName ?? assertion.title} (${assertion.status})`)
      }
    }
  }
  return problems
}

if (isMainModule(import.meta.url)) {
  const reportPath = process.argv[2] ?? 'reports/vitest.json'
  const report = JSON.parse(await readFile(reportPath, 'utf8'))
  const problems = findNonPassingTests(report)
  if (problems.length > 0) {
    console.error(`[assert-no-skips] FAIL (${problems.length})`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }
  console.log(`[assert-no-skips] OK: ${report.numTotalTests} test(s), none skipped`)
}
