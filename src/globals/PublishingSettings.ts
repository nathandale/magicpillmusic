import type { GlobalConfig } from 'payload'

export const PublishingSettings: GlobalConfig = {
  slug: 'publishing-settings',
  admin: {
    group: 'Settings',
  },
  access: {
    read: () => true,
  },
  fields: [
    // ── Feed Defaults ──
    {
      name: 'baseFeedUrl',
      type: 'text',
      admin: {
        description: 'Base URL for generated feeds (e.g. https://magicpillmusic.com)',
      },
    },
    {
      name: 'podcastTitle',
      type: 'text',
      admin: {
        description: 'Default podcast/feed title',
      },
    },
    {
      name: 'podcastDescription',
      type: 'textarea',
      admin: {
        description: 'Default podcast description',
      },
    },
    {
      name: 'language',
      type: 'text',
      defaultValue: 'en',
    },
    // ── Copyright ──
    {
      name: 'defaultCopyright',
      type: 'text',
      admin: {
        description: 'Default copyright string for feeds',
      },
    },
    // ── Category Defaults ──
    {
      name: 'defaultCategory',
      type: 'text',
      admin: {
        description: 'Default iTunes/podcast category',
      },
    },
    {
      name: 'defaultSubcategory',
      type: 'text',
    },
    // ── Owner / Publisher ──
    {
      name: 'ownerName',
      type: 'text',
      admin: {
        description: 'Feed owner name',
      },
    },
    {
      name: 'ownerEmail',
      type: 'email',
      admin: {
        description: 'Feed owner email',
      },
    },
    {
      name: 'publisherName',
      type: 'text',
    },
    {
      name: 'publisherUrl',
      type: 'text',
    },
    // ── Default Value ──
    {
      name: 'defaultSuggestedSats',
      type: 'number',
      defaultValue: 5000,
      admin: {
        description: 'Default suggested sats per stream',
      },
    },
    // ── Site Identity ──
    {
      name: 'siteImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Default feed image / site logo',
      },
    },
  ],
}
