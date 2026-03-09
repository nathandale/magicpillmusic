import type { Access, FieldAccess } from 'payload'
import type { User } from '@/payload-types'

export type Role = 'admin' | 'publisher' | 'artist'

export const ROLE_OPTIONS: { label: string; value: Role }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Publisher', value: 'publisher' },
  { label: 'Artist', value: 'artist' },
]

export const hasRole = (user: User | null, role: Role): boolean => {
  if (!user?.roles) return false
  return (user.roles as string[]).includes(role)
}

export const hasAnyRole = (user: User | null, roles: Role[]): boolean => {
  return roles.some((role) => hasRole(user, role))
}

export const isAdmin = (user: User | null): boolean => hasRole(user, 'admin')

export const isPublisher = (user: User | null): boolean =>
  hasAnyRole(user, ['admin', 'publisher'])

export const adminOnly: Access = ({ req: { user } }) => isAdmin(user as User | null)

export const adminOrPublisher: Access = ({ req: { user } }) =>
  isPublisher(user as User | null)

export const adminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdmin(user as User)) return true
  return { id: { equals: user.id } }
}

export const adminFieldAccess: FieldAccess = ({ req: { user } }) =>
  isAdmin(user as User | null)

export const publisherFieldAccess: FieldAccess = ({ req: { user } }) =>
  isPublisher(user as User | null)
