/**
 * License key constants + public-key resolution (architecture §6.1).
 *
 * The public key is safe to ship in client source; the PRIVATE key must never be committed
 * (it lives in .secrets/, gitignored — see scripts/mint-license-key.mts).
 */

/** Every key starts with this prefix: GENKA-{payloadB64}-{sigB64}. */
export const LICENSE_PREFIX = 'GENKA-'

/** Ed25519 signatures are always 64 bytes -> base64url (unpadded) = exactly 86 chars. */
export const LICENSE_SIG_B64_LEN = 86

/**
 * Development-only Ed25519 public key (raw 32 bytes, base64). Generated once via
 * `pnpm mint-key -- keygen`; the matching private key is in .secrets/genka-ed25519.key.
 *
 * !!! PRODUCTION MUST override this by setting NEXT_PUBLIC_LICENSE_PUBLIC_KEY at BUILD TIME !!!
 * Hiro runs `pnpm mint-key -- keygen` once for production, sets NEXT_PUBLIC_LICENSE_PUBLIC_KEY to
 * the printed public key, and keeps the private key OFF-REPO. Any dev key minted against the
 * constant below is WORTHLESS the moment production keys are generated.
 */
const DEV_PUBLIC_KEY = 'pAN032oZnt49sLqA9Tr0Evf2f16btpMSY6Qdg4+zazM='

/**
 * The raw 32-byte Ed25519 public key (base64) used to verify license signatures.
 * Resolves to NEXT_PUBLIC_LICENSE_PUBLIC_KEY when set (production), else the dev key above.
 */
export const LICENSE_PUBLIC_KEY_RAW_BASE64 = process.env.NEXT_PUBLIC_LICENSE_PUBLIC_KEY ?? DEV_PUBLIC_KEY
