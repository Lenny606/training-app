import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from './tokens'

const isProd = process.env.NODE_ENV === 'production'
// The __Host- prefix requires Secure + Path=/ + no Domain — only valid over
// HTTPS, so we only apply it in production.
const prefix = isProd ? '__Host-' : ''

export const ACCESS_COOKIE = `${prefix}tt_access`
export const REFRESH_COOKIE = `${prefix}tt_refresh`

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
} as const

export function setAuthCookies(accessToken: string, refreshToken: string): void {
  setCookie(ACCESS_COOKIE, accessToken, { ...baseOptions, maxAge: ACCESS_TTL_SECONDS })
  setCookie(REFRESH_COOKIE, refreshToken, { ...baseOptions, maxAge: REFRESH_TTL_SECONDS })
}

/** Refreshes just the access cookie (used on silent/explicit token refresh). */
export function setAccessCookie(accessToken: string): void {
  setCookie(ACCESS_COOKIE, accessToken, { ...baseOptions, maxAge: ACCESS_TTL_SECONDS })
}

export function clearAuthCookies(): void {
  deleteCookie(ACCESS_COOKIE, baseOptions)
  deleteCookie(REFRESH_COOKIE, baseOptions)
}

export function readAccessCookie(): string | null {
  return getCookie(ACCESS_COOKIE) ?? null
}

export function readRefreshCookie(): string | null {
  return getCookie(REFRESH_COOKIE) ?? null
}
