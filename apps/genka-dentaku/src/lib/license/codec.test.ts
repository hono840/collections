import { describe, it, expect } from 'vitest'
import { base64urlEncode, base64urlDecode, parseLicenseKey } from './codec'
import { LICENSE_PREFIX, LICENSE_SIG_B64_LEN } from './keys'

/** A syntactically valid 86-char base64url signature stand-in. */
const SIG = 'A'.repeat(LICENSE_SIG_B64_LEN)

describe('base64url', () => {
  it('round-trips arbitrary bytes without padding', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255])
    const encoded = base64urlEncode(bytes)
    expect(encoded).not.toContain('=')
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(Array.from(base64urlDecode(encoded))).toEqual(Array.from(bytes))
  })

  it('encodes bytes that map to - and _ in base64url', () => {
    // 0xFB,0xFF -> "+/" in base64 -> "-_" in base64url
    const encoded = base64urlEncode(new Uint8Array([0xfb, 0xff]))
    expect(encoded).toBe('-_8')
    expect(Array.from(base64urlDecode('-_8'))).toEqual([0xfb, 0xff])
  })
})

describe('parseLicenseKey', () => {
  it('splits a well-formed key by the fixed 86-char signature suffix', () => {
    const key = `${LICENSE_PREFIX}payload123-${SIG}`
    expect(parseLicenseKey(key)).toEqual({ payloadB64: 'payload123', sigB64: SIG })
  })

  it("handles a '-' inside the base64url payload (does not split greedily)", () => {
    const payload = 'ab-cd-ef' // contains dashes
    const key = `${LICENSE_PREFIX}${payload}-${SIG}`
    expect(parseLicenseKey(key)).toEqual({ payloadB64: payload, sigB64: SIG })
  })

  it('rejects a wrong prefix', () => {
    expect(parseLicenseKey(`WRONG-payload-${SIG}`)).toBeNull()
  })

  it('rejects a signature of the wrong length', () => {
    const shortSig = 'A'.repeat(LICENSE_SIG_B64_LEN - 1)
    expect(parseLicenseKey(`${LICENSE_PREFIX}payload-${shortSig}`)).toBeNull()
  })

  it('rejects an empty payload', () => {
    expect(parseLicenseKey(`${LICENSE_PREFIX}-${SIG}`)).toBeNull()
  })

  it('rejects a body long enough but with no separator at the split position', () => {
    // 90 chars, all 'A': passes the length guard but body[sepIndex] is 'A', not '-'
    expect(parseLicenseKey(`${LICENSE_PREFIX}${'A'.repeat(LICENSE_SIG_B64_LEN + 4)}`)).toBeNull()
  })

  it('rejects malformed / non-string input', () => {
    expect(parseLicenseKey('')).toBeNull()
    expect(parseLicenseKey('GENKA-')).toBeNull()
    // @ts-expect-error runtime guard for non-string
    expect(parseLicenseKey(null)).toBeNull()
  })
})
