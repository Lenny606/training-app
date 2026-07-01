import { beforeAll, describe, expect, it } from 'vitest'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './tokens'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-at-least-16-chars-long'
})

describe('access tokens', () => {
  it('round-trips the PublicUser projection', async () => {
    const token = await signAccessToken({ id: 'user-1', email: 'a@e.com', role: 'admin' })
    const user = await verifyAccessToken(token)
    expect(user).toEqual({ id: 'user-1', email: 'a@e.com', role: 'admin' })
  })

  it('rejects a tampered token', async () => {
    const token = await signAccessToken({ id: 'user-1', email: 'a@e.com', role: 'user' })
    expect(await verifyAccessToken(token + 'x')).toBeNull()
  })

  it('does not accept a refresh token as an access token role check', async () => {
    const { token } = await signRefreshToken('user-1')
    // refresh token has no role claim → access verification returns null
    expect(await verifyAccessToken(token)).toBeNull()
  })
})

describe('refresh tokens', () => {
  it('issues a jti and future expiry, and verifies', async () => {
    const { token, jti, expiresAt } = await signRefreshToken('user-2')
    expect(jti).toMatch(/^rt-/)
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now())

    const result = await verifyRefreshToken(token)
    expect(result).toEqual({ sub: 'user-2', jti })
  })

  it('rejects an access token used as a refresh token', async () => {
    const token = await signAccessToken({ id: 'user-2', email: 'a@e.com', role: 'user' })
    expect(await verifyRefreshToken(token)).toBeNull()
  })
})
