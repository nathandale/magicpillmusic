// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { isAdmin } from '../access/roles'
import type { User } from '@/payload-types'

export const ValueSplits: CollectionConfig = {
  slug: 'value-splits',
  admin: {
    useAsTitle: 'recipientName',
    defaultColumns: ['recipientName', 'release', 'track', 'percentage', 'lightningAddress'],
    group: 'DEMUPUB',
  },
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: ({ req: { user } }) => isAdmin(user as User | null),
  },
  fields: [
    {
      name: 'release',
      type: 'relationship',
      relationTo: 'releases',
      admin: {
        description: 'Attach to a release (for channel-level splits)',
      },
    },
    {
      name: 'track',
      type: 'relationship',
      relationTo: 'tracks',
      admin: {
        description: 'Attach to a specific track (for per-track splits)',
      },
    },
    {
      name: 'recipientName',
      type: 'text',
      required: true,
      admin: {
        description: 'Display name of the recipient',
      },
    },
    {
      name: 'paymentType',
      type: 'select',
      defaultValue: 'lightning',
      options: [
        { label: 'Lightning (Keysend)', value: 'lightning' },
      ],
      admin: {
        description: 'Payment method type',
      },
    },
    {
      name: 'lightningAddress',
      type: 'text',
      required: true,
      admin: {
        description: 'Lightning address (user@provider.com) or node pubkey',
      },
    },
    {
      name: 'percentage',
      type: 'number',
      required: true,
      min: 0,
      max: 100,
      admin: {
        description: 'Split percentage (0–100)',
      },
    },
    {
      name: 'role',
      type: 'text',
      admin: {
        description: 'Role or notes (e.g. Artist, Producer, Songwriter)',
      },
    },
  ],
}
