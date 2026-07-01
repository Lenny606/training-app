import type { Role, User } from '../domain/users'

export class EmailTakenError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists.`)
    this.name = 'EmailTakenError'
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with ID "${id}" was not found.`)
    this.name = 'UserNotFoundError'
  }
}

/** Fields required to create a user. `passwordHash` is already argon2id-hashed. */
export interface NewUser {
  email: string
  passwordHash: string
  role?: Role
}

export interface UserRepository {
  getById(id: string): Promise<User | null>
  getByEmail(email: string): Promise<User | null>
  create(user: NewUser): Promise<User>
  updateRole(id: string, role: Role): Promise<User>
}
