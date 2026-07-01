export type Role = 'user' | 'admin'

/** Full user as stored — carries `passwordHash`. Never leaves the repository layer. */
export interface User {
  id: string
  email: string
  passwordHash: string
  role: Role
  createdAt: Date
  updatedAt: Date
}

/** User projection safe to hand to server functions and the client. No `passwordHash`. */
export interface PublicUser {
  id: string
  email: string
  role: Role
}

/** Strips secrets from a stored user before it crosses the repository boundary. */
export function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, role: user.role }
}
