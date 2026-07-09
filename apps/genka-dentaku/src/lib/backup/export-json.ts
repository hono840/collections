/**
 * JSON backup export (PRD 4.g — Free). Exports the whole CanonicalState wrapped in an envelope
 * whose top-level `app` marker lets import reject foreign files. The license key IS included per
 * CPO 裁定4 (device migration restores Pro too).
 */
import type { CanonicalState } from '@/lib/domain/schema'

/** Top-level marker required by import validation. */
export const BACKUP_APP_MARKER = 'genka-dentaku'

export interface BackupEnvelope {
  app: typeof BACKUP_APP_MARKER
  exportedAt: string
  state: CanonicalState
}

/** Build the export envelope (pure). `now` is injectable for deterministic tests. */
export function buildExportEnvelope(state: CanonicalState, now: Date = new Date()): BackupEnvelope {
  return { app: BACKUP_APP_MARKER, exportedAt: now.toISOString(), state }
}

/** Pretty-printed JSON string of the backup envelope. */
export function serializeBackup(state: CanonicalState, now: Date = new Date()): string {
  return JSON.stringify(buildExportEnvelope(state, now), null, 2)
}

/** Backup filename: genka-dentaku-backup-YYYYMMDD.json (local date). */
export function backupFilename(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `genka-dentaku-backup-${y}${m}${d}.json`
}

/** Trigger a browser download of the backup JSON (no-op outside the browser). */
export function downloadBackup(state: CanonicalState, now: Date = new Date()): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([serializeBackup(state, now)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = backupFilename(now)
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Trigger a browser download of arbitrary raw text (used to save corrupt data before reset). */
export function downloadRawText(rawText: string, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const blob = new Blob([rawText], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
