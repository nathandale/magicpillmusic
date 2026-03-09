import type { CollectionConfig } from 'payload'

import { adminOnly, adminOrSelf, adminFieldAccess, ROLE_OPTIONS } from '../../access/roles'
import { authenticated } from '../../access/authenticated'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: adminOnly,
    delete: adminOnly,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  admin: {
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['artist'],
      options: ROLE_OPTIONS,
      saveToJWT: true,
      access: {
        update: adminFieldAccess,
      },
    },
  ],
  timestamps: true,
}
