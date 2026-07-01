/** Allow-list store for refresh tokens. A JWT `jti` is valid only while a
 * matching, non-revoked, non-expired row exists here — this makes otherwise
 * stateless refresh JWTs revocable (logout, rotation, reuse detection). */
export interface RefreshTokenStore {
  /** Records a freshly issued refresh token. */
  issue(jti: string, userId: string, expiresAt: Date): Promise<void>
  /** Returns true when `jti` exists, is not revoked, and has not expired. */
  isActive(jti: string): Promise<boolean>
  /** Revokes a single token (idempotent). */
  revoke(jti: string): Promise<void>
  /** Revokes every token for a user (e.g. password change, reuse detection). */
  revokeAllForUser(userId: string): Promise<void>
}
