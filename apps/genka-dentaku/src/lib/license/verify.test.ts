// @vitest-environment node
//
// Node's Web Crypto has Ed25519; jsdom's may not — hence the node environment.
// We mock keys.ts with a freshly generated test keypair (the committed dev private key is
// gitignored and absent in CI), then mint fixtures signed by that keypair.
//
// Reference dev annual key (signed by the COMMITTED dev key, worthless once Hiro regenerates):
//   GENKA-eyJwbGFuIjoiYW5udWFsIiwiaXNzIjoiZ2Vua2EtZGVudGFrdSIsImlhdCI6MTc4MzU3NDg2NywiZXhwIjoxODE1ODAyMDY3LCJyZWYiOiJkZXYtbG9jYWwifQ-2I7QYFEKfu0ki_Ct0_jI2oQkeimPoPte_zlxT-XEhFVkdyd9eV3Xlm9p0DmsvJ3zXAYyCAbsu1d-UFY0IUh6DQ
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createPrivateKey, sign, type KeyObject } from 'node:crypto'
import { verifyLicenseKey, isEd25519Supported } from './verify'
import { GRACE_DAYS } from '@/lib/constants/plans'

const holder = vi.hoisted(() => ({ publicKeyB64: '', privateKeyPem: '' }))

vi.mock('./keys', async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const jwk = publicKey.export({ format: 'jwk' }) as { x: string }
  holder.publicKeyB64 = Buffer.from(jwk.x, 'base64url').toString('base64')
  holder.privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string
  return {
    LICENSE_PREFIX: 'GENKA-',
    LICENSE_SIG_B64_LEN: 86,
    LICENSE_PUBLIC_KEY_RAW_BASE64: holder.publicKeyB64,
  }
})

const MS_PER_DAY = 86_400_000
let privateKey: KeyObject

/** Mint a GENKA-{payloadB64}-{sigB64} key from an arbitrary payload object. */
function mint(payload: Record<string, unknown>): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const sigB64 = sign(null, Buffer.from(payloadB64, 'utf8'), privateKey).toString('base64url')
  return `GENKA-${payloadB64}-${sigB64}`
}

function annualPayload(iatMs: number, expMs: number): Record<string, unknown> {
  return {
    plan: 'annual',
    iss: 'genka-dentaku',
    iat: Math.floor(iatMs / 1000),
    exp: Math.floor(expMs / 1000),
    ref: 'test',
  }
}

beforeAll(() => {
  privateKey = createPrivateKey(holder.privateKeyPem)
})

describe('isEd25519Supported', () => {
  it('is true in the Node Web Crypto environment', async () => {
    expect(await isEd25519Supported()).toBe(true)
  })
})

describe('verifyLicenseKey — statuses', () => {
  it('none: null or empty key', async () => {
    expect((await verifyLicenseKey(null)).status).toBe('none')
    expect((await verifyLicenseKey('')).status).toBe('none')
    expect((await verifyLicenseKey(null)).isPro).toBe(false)
  })

  it('active: valid signature, well before expiry', async () => {
    const now = Date.UTC(2026, 0, 1)
    const key = mint(annualPayload(now, now + 373 * MS_PER_DAY))
    const result = await verifyLicenseKey(key, now)
    expect(result.status).toBe('active')
    expect(result.isPro).toBe(true)
    expect(result.inGrace).toBe(false)
    expect(result.plan).toBe('annual')
    expect(result.expiresAt).toBe(new Date(now + 373 * MS_PER_DAY).toISOString())
  })

  it('grace: within GRACE_DAYS before expiry', async () => {
    const now = Date.UTC(2026, 0, 1)
    const exp = now + 3 * MS_PER_DAY // 3 days out, inside the 7-day grace window
    const key = mint(annualPayload(now - 370 * MS_PER_DAY, exp))
    const result = await verifyLicenseKey(key, now)
    expect(result.status).toBe('grace')
    expect(result.isPro).toBe(true)
    expect(result.inGrace).toBe(true)
  })

  it('expired: past expiry -> Free (isPro false), data still retained by the app', async () => {
    const now = Date.UTC(2026, 0, 1)
    const key = mint(annualPayload(now - 400 * MS_PER_DAY, now - MS_PER_DAY))
    const result = await verifyLicenseKey(key, now)
    expect(result.status).toBe('expired')
    expect(result.isPro).toBe(false)
    expect(result.inGrace).toBe(false)
  })

  it('invalid: tampered signature', async () => {
    const now = Date.UTC(2026, 0, 1)
    const key = mint(annualPayload(now, now + 100 * MS_PER_DAY))
    // Flip the FIRST signature character. The signature is the trailing 86 chars; its first char
    // has no base64 padding bits, so flipping it always changes a real signature byte (unlike the
    // last char, whose low bits are padding — flipping that can be a no-op and would flake).
    const sigStart = key.length - 86
    const ch = key[sigStart]
    const tampered = key.slice(0, sigStart) + (ch === 'A' ? 'B' : 'A') + key.slice(sigStart + 1)
    const result = await verifyLicenseKey(tampered, now)
    expect(result.status).toBe('invalid')
    expect(result.isPro).toBe(false)
  })

  it('invalid: malformed payload (authentic signature, wrong shape)', async () => {
    const now = Date.UTC(2026, 0, 1)
    const key = mint({ notAPlan: true }) // signed correctly but fails licensePayloadSchema
    expect((await verifyLicenseKey(key, now)).status).toBe('invalid')
  })

  it('invalid: wrong prefix fails to parse', async () => {
    const now = Date.UTC(2026, 0, 1)
    const key = mint(annualPayload(now, now + 100 * MS_PER_DAY)).replace('GENKA-', 'WRONG-')
    expect((await verifyLicenseKey(key, now)).status).toBe('invalid')
  })
})

describe('verifyLicenseKey — grace/expiry boundaries', () => {
  const iat = Date.UTC(2026, 0, 1)
  const exp = Date.UTC(2027, 0, 1)
  let key: string
  beforeAll(() => {
    key = mint(annualPayload(iat, exp))
  })

  it('active one ms before the grace window opens (exp - 7d - 1)', async () => {
    const graceStart = exp - GRACE_DAYS * MS_PER_DAY
    expect((await verifyLicenseKey(key, graceStart - 1)).status).toBe('active')
  })

  it('grace exactly at exp - 7d (boundary is grace, not active)', async () => {
    const graceStart = exp - GRACE_DAYS * MS_PER_DAY
    const result = await verifyLicenseKey(key, graceStart)
    expect(result.status).toBe('grace')
    expect(result.daysRemaining).toBe(GRACE_DAYS)
  })

  it('grace one ms before expiry', async () => {
    expect((await verifyLicenseKey(key, exp - 1)).status).toBe('grace')
  })

  it('expired exactly at exp', async () => {
    expect((await verifyLicenseKey(key, exp)).status).toBe('expired')
  })
})
