import { hash, verify } from '@node-rs/argon2'

// @node-rs/argon2 defaults to the argon2id variant with sane cost parameters.

/** Hashes a plaintext password with argon2id. */
export function hashPassword(password: string): Promise<string> {
  return hash(password)
}

/** Verifies a plaintext password against an argon2id hash. Never throws on mismatch. */
export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashed, password)
  } catch {
    return false
  }
}
