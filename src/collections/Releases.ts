// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'

import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'
import { isAdmin } from '../access/roles'
import type { User } from '@/payload-types'

export const GENRE_OPTIONS = [
  { label: 'Alternative', value: 'Alternative' },
  { label: 'Americana/Folk', value: 'Americana/Folk' },
  { label: 'Blues', value: 'Blues' },
  { label: 'Childrens', value: 'Childrens' },
  { label: 'Christmas', value: 'Christmas' },
  { label: 'Classical', value: 'Classical' },
  { label: 'Country', value: 'Country' },
  { label: 'Dance/Electronic', value: 'Dance/Electronic' },
  { label: 'Instrumental', value: 'Instrumental' },
  { label: 'Jazz', value: 'Jazz' },
  { label: 'Other', value: 'Other' },
  { label: 'Pop', value: 'Pop' },
  { label: 'R&B/Hip Hop', value: 'R&B/Hip Hop' },
  { label: 'Reggae', value: 'Reggae' },
  { label: 'Rock', value: 'Rock' },
  { label: 'Soundtrack', value: 'Soundtrack' },
]

export const Releases: CollectionConfig = {
  slug: 'releases',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'artist', 'releaseDate', 'status'],
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
      name: 'title',
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Single', value: 'single' },
        { label: 'Album', value: 'album' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'medium',
      type: 'select',
      defaultValue: 'music',
      options: [
        { label: 'Music', value: 'music' },
        { label: 'Video', value: 'video' },
      ],
      admin: {
        position: 'sidebar',
        description: 'podcast:medium — determines feed type (music or video)',
      },
    },
    {
      name: 'artist',
      type: 'relationship',
      relationTo: 'artists',
      required: true,
    },
    {
      name: 'releaseDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
        position: 'sidebar',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Square cover art (3000x3000 recommended)',
      },
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Wide banner image (3000x1000 recommended)',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'explicit',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Contains explicit content',
      },
    },
    {
      name: 'genre',
      type: 'select',
      options: GENRE_OPTIONS,
    },
    {
      name: 'subgenres',
      type: 'array',
      maxRows: 4,
      admin: {
        description: 'Up to 4 subgenre tags',
      },
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'feedLocked',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'podcast:locked — prevent feed scraping by other platforms',
      },
    },
    {
      name: 'license',
      type: 'text',
      admin: {
        description: 'e.g. Creative Commons BY 4.0',
      },
    },
    {
      name: 'upc',
      type: 'text',
      admin: {
        description: 'Universal Product Code (album-level)',
      },
    },
    {
      name: 'location',
      type: 'text',
      admin: {
        description: 'Recording location (Studio, City, etc.)',
      },
    },
    {
      name: 'socialUrl',
      type: 'text',
      admin: {
        description: 'Nostr or social discussion URL',
      },
    },
    {
      name: 'fundingLinks',
      type: 'array',
      admin: {
        description: 'Support / funding links (podcast:funding)',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            description: 'e.g. Ko-fi, Buy Me a Coffee',
          },
        },
        {
          name: 'url',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'suggestedSats',
      type: 'number',
      defaultValue: 5000,
      admin: {
        description: 'Suggested sats per stream',
        step: 100,
      },
    },
    {
      name: 'feedUrl',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: '/components/FeedUrlField#FeedUrlField',
        },
      },
    },
    {
      name: 'releaseGuid',
      type: 'text',
      unique: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stable feed GUID for this release (auto-generated)',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create' && !data?.releaseGuid) {
          const type = data?.type || 'release'
          data!.releaseGuid = `mpm-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }
        return data
      },
    ],
  },
}
