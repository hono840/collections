/**
 * Client-side license verification (architecture §6.2 / §6.3). Web Crypto (Ed25519) only — no deps.
 *
 * plan/exp/status are NEVER persisted; they are re-derived on every call from the signed key, so
 * hand-editing localStorage cannot fake Pro (tamper-resistance). Non-Ed25519 browsers degrade to
 * 'unsupported' (Free-equivalent) while keeping the key for a later re-check.
 */
import { licensePayloadSchema } from '@/lib/domain/schema'
import { GRACE_DAYS } from '@/lib/constants/plans'
import { LICENSE_PUBLIC_KEY_RAW_BASE64 } from './keys'
import { parseLicenseKey, base64urlDecode } from './codec'

export interface LicenseStatus {
  status: 'none' | 'active' | 'grace' | 'expired' | 'invalid' | 'unsupported'
  plan: 'monthly' | 'annual' | null
  issuedAt: string | null
  expiresAt: string | null
  isPro: boolean // status === 'active' || 'grace'
  inGrace: boolean // within GRACE_DAYS before exp (renewal banner)
  daysRemaining: number | null
}

const MS_PER_DAY = 86_400_000

function statusOf(status: LicenseStatus['status']): LicenseStatus {
  return { status, plan: null, issuedAt: null, expiresAt: null, isPro: false, inGrace: false, daysRemaining: null }
}

const NONE = statusOf('none')

/** Decode a standard base64 string (the embedded public key) to bytes (ArrayBuffer-backed). */
function base64Decode(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

let supportProbe: Promise<boolean> | null = null

/** Probe (and cache) whether this runtime's Web Crypto can import an Ed25519 public key. */
export function isEd25519Supported(): Promise<boolean> {
  if (supportProbe === null) {
    supportProbe = (async () => {
      try {
        await crypto.subtle.importKey(
          'raw',
          base64Decode(LICENSE_PUBLIC_KEY_RAW_BASE64),
          { name: 'Ed25519' },
          false,
          ['verify'],
        )
        return true
      } catch {
        return false
      }
    })()
  }
  return supportProbe
}

/**
 * Verify a key's signature and derive its expiry status. `nowMs` is injectable for tests.
 * Signature message = the UTF-8 bytes of the payloadB64 string (architecture §6.1).
 */
export async function verifyLicenseKey(key: string | null, nowMs?: number): Promise<LicenseStatus> {
  if (key === null || key === '') return NONE

  const parsed = parseLicenseKey(key)
  if (parsed === null) return statusOf('invalid')

  if (!(await isEd25519Supported())) return statusOf('unsupported')

  let signatureValid: boolean
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      base64Decode(LICENSE_PUBLIC_KEY_RAW_BASE64),
      { name: 'Ed25519' },
      false,
      ['verify'],
    )
    signatureValid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      base64urlDecode(parsed.sigB64),
      new TextEncoder().encode(parsed.payloadB64),
    )
  } catch {
    return statusOf('invalid')
  }
  if (!signatureValid) return statusOf('invalid')

  // Signature is authentic — now validate the payload shape.
  let payloadJson: unknown
  try {
    payloadJson = JSON.parse(new TextDecoder().decode(base64urlDecode(parsed.payloadB64)))
  } catch {
    return statusOf('invalid')
  }
  const payloadResult = licensePayloadSchema.safeParse(payloadJson)
  if (!payloadResult.success) return statusOf('invalid')
  const payload = payloadResult.data

  const now = nowMs ?? Date.now()
  const expMs = payload.exp * 1000
  const graceStartMs = expMs - GRACE_DAYS * MS_PER_DAY

  let status: LicenseStatus['status']
  if (now >= expMs) status = 'expired'
  else if (now >= graceStartMs) status = 'grace' // exp - 7d <= now < exp
  else status = 'active' // now < exp - 7d

  const isPro = status === 'active' || status === 'grace'
  return {
    status,
    plan: payload.plan,
    issuedAt: new Date(payload.iat * 1000).toISOString(),
    expiresAt: new Date(expMs).toISOString(),
    isPro,
    inGrace: status === 'grace',
    daysRemaining: Math.max(0, Math.ceil((expMs - now) / MS_PER_DAY)),
  }
}
