let cached: Uint8Array | undefined

/**
 * Returns the HMAC secret for signing/verifying JWTs, read lazily from
 * `JWT_SECRET`. In production the variable is mandatory (fail-fast); in
 * dev/test a fixed insecure fallback keeps the app runnable without config.
 */
export function getJwtSecret(): Uint8Array {
  if (cached) return cached

  const raw = process.env.JWT_SECRET
  if (raw && raw.length >= 16) {
    cached = new TextEncoder().encode(raw)
    return cached
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required (min 16 chars) in production.')
  }

  console.warn('[auth] JWT_SECRET is not set — using an INSECURE development fallback.')
  cached = new TextEncoder().encode('dev-insecure-jwt-secret-change-me')
  return cached
}
