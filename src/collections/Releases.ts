// DEMUPUB — Decentralized Music Publisher
import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'
import { isAdmin } from '../access/roles'
import {
  RELEASE_WORKFLOW_STATE_OPTIONS,
  readPublishedOrAuthenticated,
  workflowStateFieldAccess,
} from '../access/workflowTransitions'
import type { User } from '@/payload-types'
import { fundingLinksField } from '../fields/fundingLinks'
import { RELEASE_THEME_SCHEMA_VERSION, RELEASE_THEME_TOKEN_FIELDS } from '../lib/release-theme'
import { validateReleasePublishTransition } from '../hooks/validatePublishTransition'

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
    // Drafts are enabled below (`versions.drafts`); anonymous/public reads must only
    // ever see published releases. Authenticated staff (any role) see everything,
    // same as before — this only closes the new draft-visibility gap, it does not
    // change who could already read published releases.
    read: readPublishedOrAuthenticated,
    create: authenticated,
    update: authenticated,
    delete: ({ req: { user } }) => isAdmin(user as User | null),
  },
  versions: {
    drafts: {
      autosave: { interval: 100 },
      schedulePublish: true,
    },
    maxPerDoc: 50,
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
    fundingLinksField({
      admin: { description: 'Payment / support links for the whole release. Tracks can override these individually.' },
    }),
    {
      name: 'suggestedSats',
      type: 'number',
      defaultValue: 5000,
      admin: {
        description: 'Suggested sats per stream',
        step: 100,
      },
    },
    // ── MY RADIO presentation ──
    // Everything the MY RADIO player shows or does for this release lives here, so
    // nothing about a channel is hard-coded in the player. Carried in the feed as
    // <podcast:txt purpose="myradio:…"> and ignored by every other P2.0 client.
    {
      name: 'myradio',
      type: 'group',
      label: 'MY RADIO',
      admin: {
        description: 'How this release appears and behaves as a channel on myradio.nathandale.com',
      },
      fields: [
        {
          name: 'kicker',
          type: 'text',
          admin: { description: 'Small caps line above the title, e.g. "LOOKING STAR / FIRST SIGNAL OUT"' },
        },
        {
          name: 'theme',
          type: 'select',
          defaultValue: 'catalog',
          options: [
            { label: 'Catalog (default)', value: 'catalog' },
            { label: 'Terrestrial', value: 'terrestrial' },
            { label: 'Nathan Archive', value: 'nathan-archive' },
            { label: 'Wooden Revolt', value: 'wooden-revolt' },
            { label: 'Parade', value: 'parade' },
            { label: 'Monochrome', value: 'monochrome' },
          ],
          admin: { description: 'Desktop visual theme for this channel' },
        },
        // ── Signal Card theme contract (ND-MR-001) ──
        // `theme` above stays the required preset and safe fallback. Everything below
        // is optional and additive: presets already provide every required token: a
        // client that doesn't understand `themeSchemaVersion` just uses `theme` plus
        // release/track artwork (EO §7.8). Token names/validation live in
        // src/lib/release-theme.ts, shared with the publish-validation hook.
        {
          name: 'themeSchemaVersion',
          type: 'number',
          defaultValue: RELEASE_THEME_SCHEMA_VERSION,
          admin: {
            readOnly: true,
            description: 'Version of the shared release-theme schema this record’s theme fields conform to (src/schemas/release-theme.schema.json).',
          },
        },
        {
          name: 'themeRevision',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Increments whenever the published theme or its assets change. Drives cache invalidation, and invalidates any stored preview attestation or analytics receipt for this release.',
          },
        },
        {
          name: 'themeAssets',
          type: 'group',
          label: 'Theme assets',
          admin: { description: 'Approved release-identity assets shared by full MYRADIO, the Signal Card, and social-card output. Never a generated imitation.' },
          fields: [
            {
              name: 'backgroundImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Approved release background image.' },
            },
            {
              name: 'textureImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Optional grain, paper, or signal texture.' },
            },
            {
              name: 'markImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Optional approved release mark.' },
            },
          ],
        },
        {
          name: 'themeTokens',
          type: 'group',
          label: 'Theme color overrides',
          admin: {
            description: 'Optional per-release color overrides of the selected preset. Leave any field blank to inherit that token from the preset. Validated against the shared release-theme schema.',
          },
          fields: RELEASE_THEME_TOKEN_FIELDS,
        },
        {
          name: 'themeOptions',
          type: 'group',
          label: 'Theme options',
          fields: [
            {
              name: 'artworkTreatment',
              type: 'select',
              // dbName shortens the generated enum type name only — group fields
              // themselves don't support dbName in Payload 3.79, and this group's
              // path nested inside myradio inside the releases *versions* table
              // otherwise exceeds Postgres's 63-character identifier limit (hit in
              // practice generating this migration against a scratch DB; see the
              // Workstream 1A completion report).
              dbName: 'mr_artwork_treatment',
              defaultValue: 'full',
              options: [
                { label: 'Full', value: 'full' },
                { label: 'Crop', value: 'crop' },
                { label: 'Framed', value: 'framed' },
              ],
              admin: { description: 'Responsive artwork behavior.' },
            },
            {
              name: 'typeTreatment',
              type: 'select',
              dbName: 'mr_type_treatment',
              defaultValue: 'default',
              options: [
                { label: 'Default', value: 'default' },
                { label: 'Display', value: 'display' },
                { label: 'Monospace', value: 'mono' },
              ],
              admin: {
                description: 'Installed type treatment only — no uploaded web fonts in v1. This starter allowlist should be confirmed/extended against the site theme’s actual installed treatments before the Signal Card ships.',
              },
            },
            {
              name: 'surfaceTreatment',
              type: 'select',
              dbName: 'mr_surface_treatment',
              defaultValue: 'solid',
              options: [
                { label: 'Solid', value: 'solid' },
                { label: 'Gradient', value: 'gradient' },
                { label: 'Image', value: 'image' },
                { label: 'Image + gradient', value: 'image-gradient' },
              ],
            },
            {
              name: 'motion',
              type: 'select',
              dbName: 'mr_theme_motion',
              defaultValue: 'subtle',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Subtle', value: 'subtle' },
              ],
              admin: { description: 'Must honor reduced motion at the CSS level in MYRADIO; no arbitrary animation code.' },
            },
          ],
        },
        {
          name: 'signalCard',
          type: 'group',
          label: 'Signal Card',
          fields: [
            {
              name: 'layout',
              type: 'select',
              dbName: 'mr_signal_card_layout',
              defaultValue: 'standard',
              options: [
                { label: 'Standard', value: 'standard' },
                { label: 'Broadcast', value: 'broadcast' },
                { label: 'Archival', value: 'archival' },
                { label: 'Minimal', value: 'minimal' },
              ],
            },
            {
              name: 'showArtwork',
              type: 'checkbox',
              defaultValue: true,
              admin: { description: 'Turn off only when the approved background is itself the identity.' },
            },
          ],
        },
        {
          name: 'socialCard',
          type: 'group',
          label: 'Social card',
          fields: [
            {
              name: 'layout',
              type: 'select',
              dbName: 'mr_social_card_layout',
              defaultValue: 'standard',
              options: [
                { label: 'Standard', value: 'standard' },
                { label: 'Minimal', value: 'minimal' },
              ],
            },
          ],
        },
        {
          name: 'heartUrl',
          type: 'text',
          admin: { description: 'Link back to the matching section on nathandale.com/heart' },
        },
        {
          name: 'order',
          type: 'number',
          defaultValue: 100,
          admin: {
            description: 'Channel order in the MY RADIO list — lower shows first. Ties fall back to release date.',
            step: 1,
          },
        },
        {
          name: 'token',
          type: 'text',
          admin: { description: 'Short URL alias, e.g. "mkp" → myradio.nathandale.com/playlist/mkp' },
        },
        {
          name: 'isDefault',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Load this channel first when MY RADIO opens (only one should be checked)' },
        },
        {
          name: 'terrestrialHandoff',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Enable the TERRESTRIAL → MY RADIO song handoff for this channel' },
        },
      ],
    },
    // ── SHADOW / campaign distribution (ND-MR-001) ──
    {
      name: 'distribution',
      type: 'group',
      label: 'Distribution',
      admin: {
        description: 'SHADOW story relationship and campaign controls for the Signal Card publishing system. Carried in the feed as <podcast:txt purpose="myradio:…">.',
      },
      fields: [
        {
          name: 'releaseLane',
          type: 'select',
          options: [
            { label: 'Current', value: 'current' },
            { label: 'Archive', value: 'archive' },
            { label: 'Catalog', value: 'catalog' },
          ],
          admin: {
            description: 'Editorial framing. "Archive" for older/unreleased material being newly surfaced — never mark archive material as newly current.',
          },
        },
        {
          name: 'publicVisibility',
          type: 'select',
          defaultValue: 'preview',
          options: [
            { label: 'Preview', value: 'preview' },
            { label: 'Public', value: 'public' },
            { label: 'Archived', value: 'archived' },
          ],
          admin: {
            position: 'sidebar',
            description: 'Separate from the editing workflow: only "public" releases are intended to appear in the public publisher feed.',
          },
        },
        {
          name: 'shadowPostUrl',
          type: 'text',
          validate: (value: unknown) => {
            if (!value) return true
            try {
              new URL(String(value))
              return true
            } catch {
              return 'Must be a full URL, e.g. https://nathandale.com/shadow/my-radio/'
            }
          },
          admin: { description: 'Canonical SHADOW story URL. Optional while drafting; required before "SHADOW ready".' },
        },
        {
          name: 'shadowPostSlug',
          type: 'text',
          validate: (value: unknown) => {
            if (!value) return true
            return /^[a-z0-9-]+$/.test(String(value)) || 'Lowercase letters, numbers, and hyphens only.'
          },
          admin: { description: 'Ghost post slug for this release’s SHADOW story.' },
        },
        {
          name: 'defaultShareTarget',
          type: 'select',
          defaultValue: 'story',
          options: [
            { label: 'Story', value: 'story' },
            { label: 'Song', value: 'song' },
          ],
        },
        {
          name: 'embedEnabled',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Explicit authorization for public Signal Card embedding of this release.' },
        },
        {
          name: 'campaignKey',
          type: 'text',
          validate: (value: unknown) => {
            if (!value) return true
            return /^[a-z0-9-]+$/.test(String(value)) || 'Lowercase letters, numbers, and hyphens only.'
          },
          admin: {
            description: 'Stable campaign identifier for attribution/dashboard grouping. Immutable once the release reaches "scheduled" — enforced in the publish-validation hook, not just here.',
          },
        },
        {
          name: 'shareTitle',
          type: 'text',
          maxLength: 120,
          admin: { description: 'Optional social title override. Falls back to the standard "{Track} — {Artist} | MYRADIO" title when blank.' },
        },
        {
          name: 'shareDescription',
          type: 'textarea',
          maxLength: 300,
          admin: { description: 'Optional bounded social description override.' },
        },
        {
          name: 'analyticsSchemaVersion',
          type: 'number',
          defaultValue: 1,
        },
      ],
    },
    // ── Preview attestation (decision 3, 2026-09-17) ──
    // Written only by the "Run player preview" action once MYRADIO exposes a real
    // preview route (Workstream 1B). Never edited directly, and never checked live —
    // the publish-validation hook compares these snapshot values against the
    // release's *current* state to detect staleness. See
    // src/hooks/validatePublishTransition.ts condition 20.
    {
      name: 'previewAttestation',
      type: 'group',
      label: 'Preview attestation',
      admin: {
        description: 'Set only by the "Run player preview" action (not yet available — depends on Workstream 1B). Invalidated automatically when theme, tracks, player version, or analytics schema version change afterward.',
      },
      fields: [
        {
          name: 'attestedAt',
          type: 'date',
          admin: { readOnly: true, position: 'sidebar' },
        },
        {
          name: 'attestedBy',
          type: 'relationship',
          relationTo: 'users',
          admin: { readOnly: true, position: 'sidebar' },
        },
        {
          // Shortened from `themeRevisionAtAttestation` for Postgres identifier
          // length inside the versions table — see the dbName comment above.
          name: 'themeRevisionAt',
          type: 'number',
          admin: { readOnly: true, description: 'themeRevision value at the moment of attestation.' },
        },
        {
          // Shortened from `trackSetFingerprintAtAttestation`.
          name: 'trackFingerprintAt',
          type: 'text',
          admin: { readOnly: true, description: 'Composite fingerprint of track IDs, durations, and audio identifiers at the moment of attestation.' },
        },
        {
          // Shortened from `playerVersionAtAttestation`.
          name: 'playerVersionAt',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          // Shortened from `analyticsSchemaVersionAtAttestation`.
          name: 'schemaVersionAt',
          type: 'number',
          admin: { readOnly: true },
        },
      ],
    },
    // ── PostHog verification pointer (decision 4, 2026-09-17) ──
    // The append-only source of truth is the `analytics-verification-receipts`
    // collection; this is a denormalized pointer + last-known-good summary so the
    // publish-validation hook and the admin UI don't need to query that collection
    // on every read. Written only by the (not-yet-available) "Verify analytics"
    // action, via the receipts collection's afterChange hook.
    {
      name: 'analyticsVerification',
      type: 'group',
      label: 'Analytics verification',
      admin: {
        description: 'Set only by the "Verify analytics" action (not yet available — depends on Workstream 1B/4). Every attempt, pass or fail, is permanently recorded in Analytics Verification Receipts; this is just the latest passing one.',
      },
      fields: [
        {
          name: 'latest',
          type: 'relationship',
          relationTo: 'analytics-verification-receipts',
          admin: { readOnly: true, position: 'sidebar' },
        },
        {
          name: 'summary',
          type: 'group',
          label: 'Last known good',
          fields: [
            { name: 'verifiedAt', type: 'date', admin: { readOnly: true } },
            { name: 'verifiedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
            { name: 'environment', type: 'text', admin: { readOnly: true } },
            { name: 'schemaVersion', type: 'number', admin: { readOnly: true } },
            { name: 'playerVersion', type: 'text', admin: { readOnly: true } },
            { name: 'themeVersion', type: 'number', admin: { readOnly: true } },
            {
              name: 'sampleEventIds',
              type: 'array',
              // Array fields get their own child table; the full nested path here
              // (releases version table + analyticsVerification + summary +
              // sampleEventIds) exceeds Postgres's 63-char identifier limit without
              // this override — same issue as the theme-option selects above.
              dbName: 'releases_av_sample_events',
              admin: { readOnly: true },
              fields: [{ name: 'eventId', type: 'text' }],
            },
          ],
        },
      ],
    },
    {
      name: 'shadowCampaignPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/ShadowCampaignPanel#ShadowCampaignPanel',
        },
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
        description: 'Legacy two-value status. Kept as-is for backward compatibility with the existing feed routes — do not remove. `workflowState` below is the controlled, validated state for the Signal Card publishing system.',
      },
    },
    // Controlled workflow state (EO §7.5). Field-level access enforces decision 2's
    // role gating (see src/access/workflowTransitions.ts); the publish-validation
    // hook enforces the *data* conditions required to reach each late state.
    {
      name: 'workflowState',
      type: 'select',
      defaultValue: 'draft',
      options: RELEASE_WORKFLOW_STATE_OPTIONS,
      access: {
        update: workflowStateFieldAccess,
      },
      admin: {
        position: 'sidebar',
        description: 'Publisher/admin may advance most states; only admin may set "Scheduled" or "Published".',
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
      validateReleasePublishTransition,
    ],
  },
}
