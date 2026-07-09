/**
 * License key codec (architecture §6.1). base64url (no padding) + a deterministic parser that
 * splits GENKA-{payloadB64}-{sigB64} by the FIXED 86-char signature suffix — never by naive '-'
 * splitting, because base64url payloads legitimately contain '-'.
 */
import { LICENSE_PREFIX, LICENSE_SIG_B64_LEN } from './keys'

/** Encode bytes as base64url without padding (Web Crypto / Node interop). */
export function base64urlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Decode a base64url (padded or unpadded) string to bytes (ArrayBuffer-backed for Web Crypto). */
export function base64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface ParsedLicenseKey {
  payloadB64: string
  sigB64: string
}

/**
 * Parse GENKA-{payloadB64}-{sigB64}. Returns null for anything malformed.
 * Strategy: strip the prefix, take the trailing 86 chars as the signature, require the char
 * immediately before it to be '-', and treat everything earlier as the payload (which may itself
 * contain '-'). This is robust regardless of base64url characters in the payload.
 */
export function parseLicenseKey(key: string): ParsedLicenseKey | null {
  if (typeof key !== 'string' || !key.startsWith(LICENSE_PREFIX)) return null

  const body = key.slice(LICENSE_PREFIX.length)
  // body must be: (>=1 payload char) + '-' + (86 sig chars)
  if (body.length < LICENSE_SIG_B64_LEN + 2) return null

  const sepIndex = body.length - LICENSE_SIG_B64_LEN - 1
  if (body[sepIndex] !== '-') return null

  const payloadB64 = body.slice(0, sepIndex)
  const sigB64 = body.slice(sepIndex + 1)
  if (payloadB64.length === 0 || sigB64.length !== LICENSE_SIG_B64_LEN) return null

  return { payloadB64, sigB64 }
}
