// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { isAdmin, type Role } from '../access/roles'
import type { User } from '@/payload-types'

export const Artists: CollectionConfig = {
  slug: 'artists',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'user', 'status'],
    group: 'DEMUPUB',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user as User)) return true
      return { user: { equals: user.id } }
    },
    delete: ({ req: { user } }) => isAdmin(user as User | null),
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        description: 'Account that owns this artist profile',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'website',
      type: 'text',
      admin: {
        description: 'Artist website URL',
      },
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Social Links',
      maxRows: 10,
      fields: [
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'Nostr', value: 'nostr' },
            { label: 'Twitter / X', value: 'twitter' },
            { label: 'Mastodon', value: 'mastodon' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'YouTube', value: 'youtube' },
            { label: 'Bandcamp', value: 'bandcamp' },
            { label: 'Other', value: 'other' },
          ],
          required: true,
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Artist profile image',
      },
    },
    {
      name: 'lightningAddress',
      type: 'text',
      admin: {
        description: 'Default Lightning address for this artist (user@provider.com)',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
