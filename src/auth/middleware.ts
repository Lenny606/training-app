import { createMiddleware } from '@tanstack/react-start'
import type { PublicUser, Role } from '../domain/users'

// Server-function middleware for the DATA boundary. Route guards (beforeLoad)
// are UX only — every server function that touches private data must compose
// `requireAuth`/`requireRole`, because the RPC is reachable independently of the
// route that renders it.

/** Resolves the session user (nullable) from the access cookie into context. */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { getSessionUser } = await import('./session')
    const user = await getSessionUser()
    return next({ context: { user } })
  },
)

/** Requires a signed-in user; throws 401 otherwise. Narrows `context.user` to non-null. */
export const requireAuth = createMiddleware({ type: 'function' })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user) {
      const { setResponseStatus } = await import('@tanstack/react-start/server')
      setResponseStatus(401)
      throw new Error('Authentication required.')
    }
    return next({ context: { user: context.user as PublicUser } })
  })

/** Requires a specific role (implies auth). Throws 403 when the role is insufficient. */
export function requireRole(role: Role) {
  return createMiddleware({ type: 'function' })
    .middleware([requireAuth])
    .server(async ({ next, context }) => {
      if (context.user.role !== role) {
        const { setResponseStatus } =
          await import('@tanstack/react-start/server')
        setResponseStatus(403)
        throw new Error('Insufficient permissions.')
      }
      return next()
    })
}
