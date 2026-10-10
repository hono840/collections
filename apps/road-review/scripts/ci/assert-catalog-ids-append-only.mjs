#!/usr/bin/env node
// CI gate (ARCH v3 3.4 C4 / 3.5): an id that was ever published in data/catalog-ids.txt must never
// disappear (renaming a road keeps its id; removing a road means status "retired").
// Compares the base file (main's data/catalog-ids.txt) with the head file (working tree).
//
// Usage: node scripts/ci/assert-catalog-ids-append-only.mjs [--allow-missing-base] <base-file> <head-file>
//   --allow-missing-base: treat a missing base file as empty (main does not have catalog-ids.txt yet).
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isMainModule } from '../csp/html-scripts.mjs'

/**
 * One id per line; surrounding whitespace and blank lines are ignored (LF or CRLF).
 * @param {string} text
 * @returns {string[]}
 */
export function parseCatalogIds(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/**
 * Ids present in base but missing from head, in base order (each reported once).
 * @param {string} baseText
 * @param {string} headText
 * @returns {string[]}
 */
export function findRemovedCatalogIds(baseText, headText) {
  const headIds = new Set(parseCatalogIds(headText))
  return [...new Set(parseCatalogIds(baseText))].filter((id) => !headIds.has(id))
}

if (isMainModule(import.meta.url)) {
  const args = process.argv.slice(2)
  const allowMissingBase = args.includes('--allow-missing-base')
  const [basePath, headPath] = args.filter((arg) => arg !== '--allow-missing-base')
  if (!basePath || !headPath) {
    console.error('Usage: node scripts/ci/assert-catalog-ids-append-only.mjs [--allow-missing-base] <base-file> <head-file>')
    process.exit(2)
  }

  let baseText = ''
  if (existsSync(basePath)) {
    baseText = await readFile(basePath, 'utf8')
  } else if (allowMissingBase) {
    console.log(`[assert-catalog-ids-append-only] base file ${basePath} not found; treating it as empty`)
  } else {
    console.error(`[assert-catalog-ids-append-only] base file ${basePath} not found`)
    process.exit(2)
  }
  const headText = await readFile(headPath, 'utf8')

  const removed = findRemovedCatalogIds(baseText, headText)
  if (removed.length > 0) {
    console.error(`[assert-catalog-ids-append-only] FAIL: ${removed.length} id(s) removed from catalog-ids.txt`)
    for (const id of removed) console.error(`  - ${id} (keep the id; set status "retired" instead of removing it)`)
    process.exit(1)
  }
  console.log(`[assert-catalog-ids-append-only] OK: ${parseCatalogIds(headText).length} id(s), none removed`)
}
