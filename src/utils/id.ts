/**
 * Generates a unique identifier with a given prefix.
 * e.g., plan-abcd1234 or act-xyz9876
 */
export function createId(prefix: string): string {
  const hasCrypto =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  const uuid = hasCrypto
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)

  return `${prefix}-${uuid}`
}
