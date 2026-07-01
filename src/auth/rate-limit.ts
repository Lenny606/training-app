/**
 * Minimal in-memory fixed-window rate limiter. Single-node only — state lives in
 * this process and resets on restart. Good enough to blunt credential-stuffing
 * on a single VPS; swap for a shared store if the app is ever multi-node.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

/** Returns true if the action is allowed, false if the limit is exceeded. */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= limit) return false

  bucket.count += 1
  return true
}

/** Test-only: clears all buckets. */
export function resetRateLimits(): void {
  buckets.clear()
}
