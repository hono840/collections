/**
 * Ed25519 license keygen + minter (architecture §6.4). Node 22, ZERO dependencies.
 *
 * Runs via `pnpm mint-key -- <mode> ...` which invokes
 *   node --experimental-strip-types scripts/mint-license-key.mts
 * Only erasable TS syntax is used (type annotations / interfaces / `as` casts) so Node's
 * type stripping executes it with no build step and no extra tooling (tsx etc.).
 *
 * Modes:
 *   keygen                                   generate a keypair once
 *     - prints the raw 32-byte public key (base64) to stdout  -> paste into src/lib/license/keys.ts
 *     - writes the PKCS8 PEM private key to .secrets/genka-ed25519.key (mode 0600, refuses to overwrite)
 *   mint --plan monthly|annual [--ref id] [--key path]
 *     - builds a signed payload and prints GENKA-{payloadB64}-{sigB64} to stdout
 *
 * SECURITY: the private key never leaves .secrets/ (gitignored). The public key is safe to commit.
 */
import { generateKeyPairSync, createPrivateKey, sign } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import process from 'node:process'

/**
 * Validity days baked into `exp` at mint time. Mirrors src/lib/constants/plans.ts
 * (KEY_VALIDITY_DAYS) — kept inline so this script stays a zero-dependency standalone.
 * monthly = 30d + ~8d buffer, annual = 365d + ~8d buffer (architecture §6.3 / 裁定1).
 */
const KEY_VALIDITY_DAYS: Record<string, number> = { monthly: 38, annual: 373 }

const ISSUER = 'genka-dentaku'
const DEFAULT_KEY_PATH = '.secrets/genka-ed25519.key'
const SECONDS_PER_DAY = 86400

interface LicensePayload {
  plan: string
  iss: string
  iat: number
  exp: number
  ref?: string
}

/** base64url without padding (matches src/lib/license/codec.ts and Web Crypto verification). */
function base64url(bytes: Buffer): string {
  return bytes.toString('base64url')
}

/** Minimal `--flag value` parser (no deps). Booleans are not needed here. */
function parseFlags(argv: string[]): Record<string, string> {
  const flags: Record<string, string> = {}
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token.startsWith('--')) {
      const name = token.slice(2)
      const next = argv[i + 1]
      if (next === undefined || next.startsWith('--')) {
        flags[name] = 'true'
      } else {
        flags[name] = next
        i += 1
      }
    }
  }
  return flags
}

function die(message: string): never {
  process.stderr.write(`ERROR: ${message}\n`)
  process.exit(1)
}

function runKeygen(flags: Record<string, string>): void {
  const keyPath = flags.key ?? DEFAULT_KEY_PATH
  if (existsSync(keyPath)) {
    die(
      `${keyPath} already exists. Refusing to overwrite an existing signing key. ` +
        `Delete it deliberately (and rotate the embedded public key) if you truly mean to regenerate.`,
    )
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519')

  // Raw 32-byte public key: the JWK `x` member is base64url of exactly those bytes.
  const jwk = publicKey.export({ format: 'jwk' }) as { x?: string }
  if (!jwk.x) die('failed to export raw public key from generated keypair')
  const rawPublicKey = Buffer.from(jwk.x as string, 'base64url')
  const publicKeyBase64 = rawPublicKey.toString('base64')

  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string

  const dir = dirname(keyPath)
  if (dir && dir !== '.' && !existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 })
  writeFileSync(keyPath, privatePem, { mode: 0o600 })

  process.stderr.write(`Wrote PKCS8 private key to ${keyPath} (mode 0600). KEEP IT SECRET — never commit.\n`)
  process.stderr.write('Paste the public key below into src/lib/license/keys.ts (DEV_PUBLIC_KEY):\n')
  // The raw base64 public key alone on stdout so it can be captured programmatically.
  process.stdout.write(`${publicKeyBase64}\n`)
}

function runMint(flags: Record<string, string>): void {
  const plan = flags.plan
  if (plan !== 'monthly' && plan !== 'annual') {
    die("--plan is required and must be 'monthly' or 'annual'")
  }

  const keyPath = flags.key ?? process.env.GENKA_SIGNING_KEY_PATH ?? DEFAULT_KEY_PATH
  if (!existsSync(keyPath)) {
    die(`signing key not found at ${keyPath}. Run \`pnpm mint-key -- keygen\` first (or pass --key <path>).`)
  }
  const privateKey = createPrivateKey(readFileSync(keyPath, 'utf8'))

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + KEY_VALIDITY_DAYS[plan] * SECONDS_PER_DAY

  const payload: LicensePayload = { plan, iss: ISSUER, iat, exp }
  if (flags.ref && flags.ref !== 'true') payload.ref = flags.ref

  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  // Ed25519 uses algorithm = null; the message is the UTF-8 bytes of the payloadB64 string.
  const signature = sign(null, Buffer.from(payloadB64, 'utf8'), privateKey)
  const sigB64 = base64url(signature)

  process.stderr.write(
    `Minted ${plan} key: iat=${new Date(iat * 1000).toISOString()} exp=${new Date(exp * 1000).toISOString()}` +
      `${payload.ref ? ` ref=${payload.ref}` : ''}\n`,
  )
  process.stdout.write(`GENKA-${payloadB64}-${sigB64}\n`)
}

function main(): void {
  // Some pnpm versions forward the `--` separator through to the script; drop a leading one
  // so both `pnpm mint-key -- keygen` and `pnpm mint-key keygen` work.
  const argv = process.argv.slice(2).filter((token, index) => !(index === 0 && token === '--'))
  const mode = argv[0]
  const flags = parseFlags(argv.slice(1))

  if (mode === 'keygen') {
    runKeygen(flags)
  } else if (mode === 'mint') {
    runMint(flags)
  } else {
    process.stderr.write(
      'Usage:\n' +
        '  pnpm mint-key -- keygen [--key <path>]\n' +
        '  pnpm mint-key -- mint --plan monthly|annual [--ref <orderId>] [--key <path>]\n',
    )
    process.exit(mode === undefined ? 1 : 1)
  }
}

main()
